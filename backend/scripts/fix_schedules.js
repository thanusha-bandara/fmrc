import db from '../config/db.js';

const fix = async () => {
  try {
    await db.query("DELETE FROM Schedules");
    console.log("All schedules deleted.");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
};
fix();
