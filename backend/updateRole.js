import db from './config/db.js';
const run = async () => {
    try {
        await db.query(`ALTER TABLE Users MODIFY COLUMN role ENUM('Admin', 'Technical_Assistant', 'Mechanical_Engineer', 'Chief_Engineer', 'Agriculture_Instructor') NOT NULL`);
        console.log('Done');
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();
