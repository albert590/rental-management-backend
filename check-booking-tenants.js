const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not available. Make sure your .env file is loaded."
    );
  }

  await mongoose.connect(MONGODB_URI);

  const db = mongoose.connection.db;

  const bookingRequests = await db
    .collection("bookingrequests")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  console.log("\n========================================");
  console.log("BOOKING REQUEST TENANT CHECK");
  console.log("========================================\n");

  let validCount = 0;
  let unknownCount = 0;

  for (const request of bookingRequests) {
    console.log("----------------------------------------");

    console.log("Booking ID:", request._id.toString());

    const tenantId = request.tenant;

    console.log(
      "Tenant ID:",
      tenantId ? tenantId.toString() : "MISSING"
    );

    // Find tenant using the booking request tenant ObjectId
    const tenant = tenantId
      ? await db.collection("tenants").findOne({
          _id: tenantId,
        })
      : null;

    // Get unit
    const unit = request.unit
      ? await db.collection("units").findOne({
          _id: request.unit,
        })
      : null;

    // Get property
    const property = request.property
      ? await db.collection("properties").findOne({
          _id: request.property,
        })
      : null;

    if (tenant) {
      validCount++;

      console.log(
        "Tenant:",
        `${tenant.name} (${tenant.email})`
      );
    } else {
      unknownCount++;

      console.log(
        "Tenant: ❌ UNKNOWN TENANT"
      );
    }

    console.log(
      "Tenant document exists:",
      tenant ? "YES" : "NO"
    );

    console.log(
      "Unit:",
      unit
        ? `${unit.unitNumber} - KSh ${unit.monthlyRent}`
        : "❌ UNKNOWN UNIT"
    );

    console.log(
      "Property:",
      property
        ? property.name
        : "❌ UNKNOWN PROPERTY"
    );

    console.log(
      "Status:",
      request.status || "pending"
    );

    console.log(
      "Message:",
      request.message || "No message"
    );

    console.log(
      "Created:",
      request.createdAt
        ? new Date(request.createdAt).toLocaleString()
        : "Unknown"
    );

    console.log();
  }

  console.log("========================================");
  console.log("SUMMARY");
  console.log("========================================");

  console.log(
    "Total booking requests:",
    bookingRequests.length
  );

  console.log(
    "Valid tenant links:",
    validCount
  );

  console.log(
    "Unknown tenant links:",
    unknownCount
  );

  console.log("========================================\n");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("\nERROR:");
  console.error(error);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});