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
            status ENUM('Pending','Completed') NOT NULL DEFAULT 'Pending',
            requested_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP NULL DEFAULT NULL,
            PRIMARY KEY (request_id),
            KEY user_id (user_id),
            CONSTRAINT password_reset_requests_ibfk_1 FOREIGN KEY (user_id) REFERENCES Users (user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('Password_Reset_Requests table is ready.');
    process.exit(0);
}
run().catch((err) => {
    console.error(err);
    process.exit(1);
});
