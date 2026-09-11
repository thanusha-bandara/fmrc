import db from '../config/db.js';

// Non-destructive, idempotent migration for existing databases (created before
// Test_Form_Schemas existed): adds the table plus Test_Records.schema_id + its FK, without
// touching any existing rows. For a brand-new database, `npm run initdb` already includes
// this DDL directly -- this script is only needed to bring an already-running DB up to date.
const migrate = async () => {
  try {
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
    console.log("Test_Form_Schemas table ready.");

    const [cols] = await db.query(`SHOW COLUMNS FROM Test_Records LIKE 'schema_id'`);
    if (cols.length === 0) {
      await db.query(`ALTER TABLE Test_Records ADD COLUMN schema_id INT NULL AFTER chief_engineer_id`);
      await db.query(`
        ALTER TABLE Test_Records
        ADD CONSTRAINT fk_test_records_schema
        FOREIGN KEY (schema_id) REFERENCES Test_Form_Schemas(schema_id) ON DELETE SET NULL
      `);
      console.log("Test_Records.schema_id column + FK added.");
    } else {
      console.log("Test_Records.schema_id already exists, skipping.");
    }

    console.log("Migration complete.");
  } catch (error) {
    console.error("Migration failed:", error.message);
  } finally {
    process.exit();
  }
};

migrate();
