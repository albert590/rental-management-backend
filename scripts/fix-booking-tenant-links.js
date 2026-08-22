require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not available.");
  }

  console.log("Connecting to MongoDB...");

  await mongoose.connect(MONGODB_URI);

  console.log("MongoDB connected successfully.\n");

  const db = mongoose.connection.db;

  const bookingRequests = db.collection("bookingrequests");
  const users = db.collection("users");
  const tenants = db.collection("tenants");

  console.log("========================================");
  console.log("FIX BOOKING REQUEST TENANT LINKS");
  console.log("========================================\n");

  let fixedCount = 0;
  let skippedCount = 0;

  const requests = await bookingRequests.find({}).toArray();

  for (const request of requests) {
    console.log("----------------------------------------");

    console.log(
      "Booking ID:",
      request._id.toString()
    );

    if (!request.tenant) {
      console.log("❌ Booking has no tenant ID");
      skippedCount++;
      continue;
    }

    const currentTenantId = request.tenant;

    /*
     * First check whether the current ID is
     * already a real Tenant ID.
     */
    const existingTenant = await tenants.findOne({
      _id: currentTenantId,
    });

    if (existingTenant) {
      console.log(
        "✅ Already linked to tenant:",
        existingTenant.name,
        existingTenant.email
      );

      skippedCount++;
      continue;
    }

    /*
     * The current tenant ID may actually be
     * a User ID.
     */
    const user = await users.findOne({
      _id: currentTenantId,
    });

    if (!user) {
      console.log(
        "❌ Could not find user for current tenant ID:",
        currentTenantId.toString()
      );

      skippedCount++;
      continue;
    }

    console.log(
      "Found User:",
      user.name || "Unknown",
      "|",
      user.email || "No email"
    );

    if (!user.email) {
      console.log("❌ User has no email");
      skippedCount++;
      continue;
    }

    /*
     * Find the real Tenant using the user's email.
     */
    const tenant = await tenants.findOne({
      email: user.email.toLowerCase().trim(),
    });

    if (!tenant) {
      console.log(
        "❌ No Tenant profile found for:",
        user.email
      );

      skippedCount++;
      continue;
    }

    console.log(
      "Correct Tenant:",
      tenant.name,
      "|",
      tenant.email
    );

    console.log(
      "Old tenant ID:",
      currentTenantId.toString()
    );

    console.log(
      "New tenant ID:",
      tenant._id.toString()
    );

    /*
     * Replace the incorrect User ID with
     * the correct Tenant ID.
     */
    const result = await bookingRequests.updateOne(
      {
        _id: request._id,
      },
      {
        $set: {
          tenant: tenant._id,
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 1) {
      console.log("✅ FIXED");
      fixedCount++;
    } else {
      console.log("⚠️ Nothing changed");
      skippedCount++;
    }
  }

  console.log("\n========================================");
  console.log("MIGRATION SUMMARY");
  console.log("========================================");

  console.log(
    "Total booking requests:",
    requests.length
  );

  console.log(
    "Fixed:",
    fixedCount
  );

  console.log(
    "Skipped:",
    skippedCount
  );

  console.log("========================================\n");

  await mongoose.disconnect();

  console.log("MongoDB disconnected.");
}

main().catch(async (error) => {
  console.error("\nERROR:");
  console.error(error);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});