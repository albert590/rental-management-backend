const path = require("path");
const mongoose = require("mongoose");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});

const MONGODB_URI = process.env.MONGODB_URI;

// OLD tenant ID found on the 8 booking requests
const OLD_TENANT_ID =
  "6a8737768bb1b8610badec63";

// CURRENT Boaz tenant ID
const CURRENT_TENANT_ID =
  "6a875c9b0b208c2ffb403bb0";

async function main() {
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not available. Check your .env file."
    );
  }

  console.log("Connecting to MongoDB...");

  await mongoose.connect(MONGODB_URI);

  console.log("MongoDB connected successfully.\n");

  const db = mongoose.connection.db;

  if (!db) {
    throw new Error(
      "MongoDB database connection is not available."
    );
  }

  const oldTenantObjectId =
    new mongoose.Types.ObjectId(
      OLD_TENANT_ID
    );

  const currentTenantObjectId =
    new mongoose.Types.ObjectId(
      CURRENT_TENANT_ID
    );

  /*
   * Verify the current tenant exists.
   */
  const currentTenant =
    await db.collection("tenants").findOne({
      _id: currentTenantObjectId,
    });

  if (!currentTenant) {
    throw new Error(
      "Current tenant was not found. Nothing was changed."
    );
  }

  console.log("Current tenant found:");
  console.log(
    "Name:",
    currentTenant.name
  );
  console.log(
    "Email:",
    currentTenant.email
  );
  console.log(
    "Tenant ID:",
    currentTenant._id.toString()
  );

  /*
   * Find affected booking requests.
   */
  const affectedRequests =
    await db
      .collection("bookingrequests")
      .find({
        tenant: oldTenantObjectId,
      })
      .toArray();

  console.log(
    `\nBooking requests to repair: ${affectedRequests.length}`
  );

  if (affectedRequests.length === 0) {
    console.log(
      "\nNo booking requests need repair."
    );

    await mongoose.disconnect();
    return;
  }

  console.log("\nAffected booking IDs:");

  for (const request of affectedRequests) {
    console.log(
      `- ${request._id.toString()} | ${
        request.status || "pending"
      }`
    );
  }

  /*
   * Update ONLY the tenant field.
   *
   * We do NOT change:
   * - unit
   * - property
   * - status
   * - message
   * - createdAt
   */
  const result =
    await db
      .collection("bookingrequests")
      .updateMany(
        {
          tenant: oldTenantObjectId,
        },
        {
          $set: {
            tenant: currentTenantObjectId,
          },
        }
      );

  console.log("\n========================================");
  console.log("REPAIR COMPLETE");
  console.log("========================================");

  console.log(
    "Matched:",
    result.matchedCount
  );

  console.log(
    "Updated:",
    result.modifiedCount
  );

  console.log(
    "Old tenant ID:",
    OLD_TENANT_ID
  );

  console.log(
    "New tenant ID:",
    CURRENT_TENANT_ID
  );

  console.log(
    "Tenant:",
    currentTenant.name
  );

  console.log(
    "Email:",
    currentTenant.email
  );

  console.log("========================================\n");

  await mongoose.disconnect();

  console.log("MongoDB disconnected.");
}

main().catch(async (error) => {
  console.error("\n========================================");
  console.error("ERROR");
  console.error("========================================");

  console.error(error);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});