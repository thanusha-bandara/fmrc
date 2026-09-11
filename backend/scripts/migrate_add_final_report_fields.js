import db from '../config/db.js';

// Non-destructive, idempotent migration for an already-running database: adds the Machinery
// report-metadata columns and the Test_Records final-report-selection columns, without
// touching any existing rows. For a brand-new database, `npm run initdb` already includes
// this DDL directly -- this script only brings an existing DB up to date.
const COLUMNS = {
    Machinery: [
        ['document_ref_number', 'VARCHAR(50) NULL'],
        ['manufacturer_country', 'VARCHAR(100) NULL'],
        ['importer_name', 'VARCHAR(150) NULL'],
        ['importer_address', 'TEXT NULL'],
        ['importer_tel', 'VARCHAR(100) NULL'],
        ['importer_fax', 'VARCHAR(100) NULL'],
        ['importer_web', 'VARCHAR(150) NULL'],
        ['rops_available', 'BOOLEAN NULL'],
        ['safety_note', 'TEXT NULL'],
        ['background_note', 'TEXT NULL']
    ],
    Test_Records: [
        ['include_in_final_report', 'BOOLEAN DEFAULT FALSE'],
        ['group_key', 'VARCHAR(50) NULL']
    ]
};

const migrate = async () => {
    try {
        for (const [table, columns] of Object.entries(COLUMNS)) {
            for (const [column, definition] of columns) {
                const [existing] = await db.query(`SHOW COLUMNS FROM ${table} LIKE '${column}'`);
                if (existing.length === 0) {
                    await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
                    console.log(`${table}.${column} added.`);
                } else {
                    console.log(`${table}.${column} already exists, skipping.`);
                }
            }
        }
        console.log("Migration complete.");
    } catch (error) {
        console.error("Migration failed:", error.message);
    } finally {
        process.exit();
    }
};

migrate();
