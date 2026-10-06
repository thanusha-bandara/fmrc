
import pool from './config/db.js';
async function run() {
  const [rows] = await pool.query(SELECT m.machine_name, m.responsible_ta_id, t.test_id FROM test_records t JOIN machinery m ON t.machine_id = m.machine_id WHERE t.status IN ('Scheduled', 'Rescheduled', 'Pending'));
  console.log(rows);
  process.exit();
}
run();

