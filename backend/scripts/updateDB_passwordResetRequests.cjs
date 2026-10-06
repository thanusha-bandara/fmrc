require('dotenv').config({ quiet: true });
const mysql = require('mysql2/promise');

async function run() {
    const con = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    await con.query(`
        CREATE TABLE IF NOT EXISTS Password_Reset_Requests (
            request_id INT NOT NULL AUTO_INCREMENT,
            user_id INT NOT NULL,
            username VARCHAR(50) NULL,
            status ENUM('Pending','Completed') NOT NULL DEFAULT 'Pending',
            requested_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP NULL DEFAULT NULL,
            PRIMARY KEY (request_id),
            KEY user_id (user_id),
            CONSTRAINT password_reset_requests_ibfk_1 FOREIGN KEY (user_id) REFERENCES Users (user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    const [cols] = await con.query(`SHOW COLUMNS FROM Password_Reset_Requests LIKE 'username'`);
    if (cols.length === 0) {
        await con.query(`ALTER TABLE Password_Reset_Requests ADD COLUMN username VARCHAR(50) NULL AFTER user_id`);
    }
    await con.query(`
        UPDATE Password_Reset_Requests r JOIN Users u ON u.user_id = r.user_id
        SET r.username = u.username WHERE r.username IS NULL
    `);
    console.log('Password_Reset_Requests table is ready.');
    process.exit(0);
}
run().catch((err) => {
    console.error(err);
    process.exit(1);
});
