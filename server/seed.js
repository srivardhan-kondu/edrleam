import "dotenv/config";
import bcrypt from "bcryptjs";
import dbConnect from "./db.js";
import User from "./models/User.js";

async function seed() {
  await dbConnect();

  const existing = await User.findOne({ email: "admin@edleam.com" });
  if (existing) {
    console.log("Admin already exists");
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash("admin123", 12);

  await User.create({
    name: "Admin",
    email: "admin@edleam.com",
    password: hashedPassword,
    role: "admin",
    status: "approved",
  });

  console.log("Admin created. Email: admin@edleam.com, Password: admin123");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
