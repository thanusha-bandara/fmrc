const mysql = require('mysql2/promise');

async function run() {
    const con = await mysql.createConnection({
        host: '127.0.0.1', 
        user: 'root', 
        password: '1234', 
        database: 'fmrc_db'
    });
    
    console.log('Fixing tables...');

    await con.query(`DROP TABLE IF EXISTS Resource_Audit_Log`);
    await con.query(`DROP TABLE IF EXISTS labour_availability`);
    await con.query(`DROP TABLE IF EXISTS labours`);
    await con.query(`DROP TABLE IF EXISTS farm_seasons`);
    await con.query(`DROP TABLE IF EXISTS farm_daily_status`);

    await con.query(`
    CREATE TABLE IF NOT EXISTS farm_daily_status (
    date DATE NOT NULL PRIMARY KEY,
    is_field_available BOOLEAN DEFAULT TRUE,
    is_water_available BOOLEAN DEFAULT FALSE
   ) ENGINE=InnoDB
    `);

    await con.query(`
    CREATE TABLE IF NOT EXISTS farm_seasons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    season_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL
   ) ENGINE=InnoDB
    `);

    await con.query(`
    CREATE TABLE IF NOT EXISTS labours (
    labour_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   ) ENGINE=InnoDB
    `);

    await con.query(`
    CREATE TABLE IF NOT EXISTS labour_availability (
    availability_id INT AUTO_INCREMENT PRIMARY KEY,
    labour_id INT NOT NULL,
    date DATE NOT NULL,
    is_on_leave BOOLEAN DEFAULT FALSE,
    reason VARCHAR(255) NULL,
    UNIQUE KEY unique_labour_date (labour_id, date),
    FOREIGN KEY (labour_id) REFERENCES labours(labour_id) ON DELETE CASCADE
   ) ENGINE=InnoDB
    `);

    await con.query(`
    CREATE TABLE IF NOT EXISTS Resource_Audit_Log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
    `);

    console.log('Tables fixed.');
    process.exit(0);
}
run().catch(e => {
    console.error(e);
    process.exit(1);
});
