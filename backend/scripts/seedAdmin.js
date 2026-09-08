import bcrypt from "bcrypt";
import db from "../config/db.js";

// Creates the first Admin account so someone can log in and create the rest of the users.
// Usage: node scripts/seedAdmin.js
const seedAdmin = async () => {
  try {
    const username = process.env.SEED_ADMIN_USERNAME || "admin";
    const password = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
    const email = process.env.SEED_ADMIN_EMAIL || "admin@fmrc.gov.lk";

    const [existing] = await db.query(
      `SELECT user_id FROM Users WHERE username = ? OR email = ?`,
      [username, email]
    );

    if (existing.length > 0) {
      console.log(`Admin user "${username}" already exists. Skipping.`);
      process.exit(0);
    }

    const password_hash = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO Users (full_name, username, email, password_hash, phone, role, is_active)
       VALUES (?, ?, ?, ?, ?, 'Admin', TRUE)`,
      ["System Administrator", username, email, password_hash, null]
    );

    console.log("Admin user created successfully.");
    console.log(`  username: ${username}`);
    console.log(`  password: ${password}`);
    console.log("Please log in and change this password immediately.");
  } catch (error) {
    console.error("Failed to seed admin user:", error.message);
  } finally {
    process.exit();
  }
};

seedAdmin();
