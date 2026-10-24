import mysql2 from "mysql2";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql2.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // DATE columns (registration_date, scheduled_date, etc.) have no time-of-day or timezone
  // of their own -- returning them as JS Date objects makes mysql2 anchor them to the
  // server process's local timezone, which then shifts a day backwards once serialized to
  // UTC ISO strings in JSON responses (e.g. stored '2024-11-22' becomes
  // '2024-11-21T18:30:00.000Z' in a UTC+5:30 environment). Returning DATE columns as plain
  // 'YYYY-MM-DD' strings instead avoids that ambiguity entirely.
  dateStrings: ["DATE"],
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
  console.log("Connected to the database.");
  connection.query("ALTER TABLE Machinery ADD COLUMN is_on_hold BOOLEAN DEFAULT FALSE", () => {});
  connection.query("ALTER TABLE Machinery ADD COLUMN hold_reason TEXT DEFAULT NULL", () => {});
  connection.release();
});

export default pool.promise();