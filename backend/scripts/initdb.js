import db from "../config/db.js";

const createTables = async () => {
  try {
    console.log("Database creation started...");

    // Full reset (dev database) so schema edits below always take effect.
    // Dropped in FK-safe order: child tables before the tables they reference.
    await db.query(`DROP TABLE IF EXISTS Reports`);
    await db.query(`DROP TABLE IF EXISTS Schedules`);
    await db.query(`DROP TABLE IF EXISTS Test_Records`);
    await db.query(`DROP TABLE IF EXISTS Test_Form_Schemas`);
    await db.query(`DROP TABLE IF EXISTS Staff_Availability`);
    await db.query(`DROP TABLE IF EXISTS Weather_Logs`);
    await db.query(`DROP TABLE IF EXISTS FMRC_Calendar`);
    await db.query(`DROP TABLE IF EXISTS Field_Status`);
    await db.query(`DROP TABLE IF EXISTS Machinery`);
    await db.query(`DROP TABLE IF EXISTS Users`);

    // Users Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS Users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(150) NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        role ENUM('Admin', 'Technical_Assistant', 'Mechanical_Engineer', 'Chief_Engineer') NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);
    console.log("Users table created.");

    // FMRC Calendar Table (holidays / special non-working days)
    await db.query(`
      CREATE TABLE IF NOT EXISTS FMRC_Calendar (
        calendar_id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        reason VARCHAR(255),
        is_holiday BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);
    console.log("FMRC_Calendar table created.");

    // Machinery Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS Machinery (
        machine_id INT AUTO_INCREMENT PRIMARY KEY,
        machine_name VARCHAR(150) NOT NULL,
        model VARCHAR(100),
        supplier VARCHAR(100),
        registration_date DATE NOT NULL,
        document_ref_number VARCHAR(50) NULL,
        manufacturer_country VARCHAR(100) NULL,
        importer_name VARCHAR(150) NULL,
        importer_address TEXT NULL,
        importer_tel VARCHAR(100) NULL,
        importer_fax VARCHAR(100) NULL,
        importer_web VARCHAR(150) NULL,
        rops_available BOOLEAN NULL,
        safety_note TEXT NULL,
        background_note TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);
    console.log("Machinery table created.");
     //resources availability 
        //1, field status
    await db.query(`
    CREATE TABLE IF NOT EXISTS Field_Status (
    field_id INT AUTO_INCREMENT PRIMARY KEY,
    field_name VARCHAR(100) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    water_available BOOLEAN DEFAULT FALSE,
    season ENUM('Yala', 'Maha', 'Off-Season') DEFAULT 'off-season',
    is_land_preparation_period BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
   ) ENGINE=InnoDB
    `);
    console.log("Field_Status table created.");

        // 2,staf_ availability

    await db.query(`
    CREATE TABLE IF NOT EXISTS Staff_Availability (
    availability_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    is_on_leave BOOLEAN DEFAULT FALSE,
    reason VARCHAR(255) NULL,
    UNIQUE KEY unique_user_date (user_id, date),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
    `);
    console.log("Staff_Availability table created.");

    //3,weather logs 

    await db.query(`
    CREATE TABLE IF NOT EXISTS Weather_Logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    log_date DATE NOT NULL UNIQUE,
    is_rainy BOOLEAN DEFAULT FALSE,
    marked_by ENUM('API', 'Manual') DEFAULT 'API',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
    `);
    console.log("Weather_Logs table created.");



    // Test Form Schemas Table (structured field/table definitions for the standard test
    // catalog, stored as JSON so a layout change is a DB update, not a code deploy -- see
    // scripts/testSchemaDefinitions.js + seed_test_schemas.js)
    await db.query(`
      CREATE TABLE IF NOT EXISTS Test_Form_Schemas (
        schema_id INT AUTO_INCREMENT PRIMARY KEY,
        schema_key VARCHAR(50) UNIQUE NOT NULL,
        label VARCHAR(150) NOT NULL,
        formula_set VARCHAR(50) NULL,
        schema_json JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);
    console.log("Test_Form_Schemas table created.");

    // Test Records Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS Test_Records (
        test_id INT AUTO_INCREMENT PRIMARY KEY,
        machine_id INT NOT NULL,
        test_name VARCHAR(100) NOT NULL,
        is_field_test BOOLEAN DEFAULT TRUE,
        requires_water BOOLEAN DEFAULT FALSE,
        required_season ENUM('Ploughing', 'Harvesting', 'Any') DEFAULT 'Any',
        technical_assistant_id INT,
        mechanical_engineer_id INT,
        chief_engineer_id INT,
        schema_id INT NULL,
        include_in_final_report BOOLEAN DEFAULT FALSE,
        group_key VARCHAR(50) NULL,
        catalog_key VARCHAR(50) NULL,
        form_data JSON NULL,
        status ENUM('Draft', 'Submitted', 'Reviewed', 'Approved', 'Rejected') DEFAULT 'Draft',
        me_recommendation ENUM('Pending', 'Recommended', 'Not Recommended') DEFAULT 'Pending',
        me_comments TEXT NULL,
        ce_comments TEXT NULL,
        submitted_at TIMESTAMP NULL,
        reviewed_at TIMESTAMP NULL,
        approved_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (machine_id) REFERENCES Machinery(machine_id) ON DELETE CASCADE,
        FOREIGN KEY (technical_assistant_id) REFERENCES Users(user_id) ON DELETE SET NULL,
        FOREIGN KEY (mechanical_engineer_id) REFERENCES Users(user_id) ON DELETE SET NULL,
        FOREIGN KEY (chief_engineer_id) REFERENCES Users(user_id) ON DELETE SET NULL,
        FOREIGN KEY (schema_id) REFERENCES Test_Form_Schemas(schema_id) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);
    console.log("Test_Records table created.");

    //Schedules Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS Schedules (
        schedule_id INT AUTO_INCREMENT PRIMARY KEY,
        test_id INT NOT NULL,
        field_id INT,
        assigned_ta_id INT,
        scheduled_date DATE NOT NULL,
        time_slot VARCHAR(50) NOT NULL,
        status ENUM('Scheduled', 'In-Progress', 'Completed', 'Rescheduled', 'Cancelled') DEFAULT 'Scheduled',
        reschedule_reason VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_id) REFERENCES Test_Records(test_id) ON DELETE CASCADE,
        FOREIGN KEY (field_id) REFERENCES field_status(field_id) ON DELETE RESTRICT,
        FOREIGN KEY (assigned_ta_id) REFERENCES Users(user_id) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);
    console.log("Schedules table created.");

    //Reports Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS Reports (
        report_id INT AUTO_INCREMENT PRIMARY KEY,
        test_id INT UNIQUE NULL,
        machine_id INT NULL,
        report_type VARCHAR(100) NOT NULL,
        pdf_file_path VARCHAR(255) NOT NULL,
        approved_by INT NULL,
        approval_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        certification_status ENUM('Certified', 'Failed', 'Conditional') DEFAULT 'Certified',
        ce_status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
        ce_comments TEXT NULL,
        decided_at TIMESTAMP NULL,
        FOREIGN KEY (test_id) REFERENCES Test_Records(test_id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES Users(user_id) ON DELETE RESTRICT
      ) ENGINE=InnoDB
    `);
    console.log("Reports table created.");

    console.log("FMRC database tables created successfully!");

  } catch (error) {
    console.error("Failed to create tables:", error.message);
  } finally {
    process.exit();
  }
};

createTables();