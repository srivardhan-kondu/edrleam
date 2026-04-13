import "dotenv/config";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import dbConnect from "./db.js";
import User from "./models/User.js";

async function seed() {
  await dbConnect();

  const adminEmail = process.env.ADMIN_EMAIL || "admin@gmail.com";
  const existing = await User.findOne({ email: adminEmail });
  if (existing) {
    console.log("Admin already exists");
    process.exit(0);
  }

  // Generate a secure random password — shown ONCE, never logged again
  const randomPassword = crypto.randomBytes(12).toString("base64url");
  const hashedPassword = await bcrypt.hash(randomPassword, 12);

  await User.create({
    name: "Admin",
    email: adminEmail,
    password: hashedPassword,
    role: "admin",
    status: "approved",
  });

  console.log("\n══════════════════════════════════════════");
  console.log("  Admin account created successfully.");
  console.log(`  Email:    ${adminEmail}`);
  console.log(`  Password: ${randomPassword}`);
  console.log("  ⚠️  Save this password now — it will NOT be shown again.");
  console.log("══════════════════════════════════════════\n");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
