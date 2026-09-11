import db from '../config/db.js';

// Non-destructive, idempotent migration for an already-running database: adds
// Test_Records.catalog_key and the Reports table's ce_status/ce_comments/decided_at columns,
// relaxes Reports.approved_by to nullable (a report is now created by ME's finalize action,
// before any CE decision exists), and backfills catalog_key on already-generated tests.
const ADD_COLUMNS = {
    Test_Records: [
        ['catalog_key', 'VARCHAR(50) NULL']
    ],
    Reports: [
        ['ce_status', "ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending'"],
        ['ce_comments', 'TEXT NULL'],
        ['decided_at', 'TIMESTAMP NULL']
    ]
};

const migrate = async () => {
    try {
        for (const [table, columns] of Object.entries(ADD_COLUMNS)) {
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

        const [approvedByCol] = await db.query(`SHOW COLUMNS FROM Reports LIKE 'approved_by'`);
        if (approvedByCol[0] && approvedByCol[0].Null === 'NO') {
            await db.query(`ALTER TABLE Reports MODIFY COLUMN approved_by INT NULL`);
            console.log("Reports.approved_by relaxed to nullable.");
        } else {
            console.log("Reports.approved_by already nullable, skipping.");
        }

        // Backfill catalog_key on already-generated standard tests.
        const [r1] = await db.query(
            `UPDATE Test_Records SET catalog_key = 'FOUR_WHEEL_TRACTOR' WHERE machine_id IN (41, 42, 43) AND catalog_key IS NULL AND schema_id IS NOT NULL`
        );
        console.log(`Backfilled catalog_key='FOUR_WHEEL_TRACTOR' on ${r1.affectedRows} row(s).`);

        const [r2] = await db.query(
            `UPDATE Test_Records SET catalog_key = 'COMBINE_HARVESTER' WHERE machine_id IN (49) AND catalog_key IS NULL AND schema_id IS NOT NULL`
        );
        console.log(`Backfilled catalog_key='COMBINE_HARVESTER' on ${r2.affectedRows} row(s).`);

        console.log("Migration complete.");
    } catch (error) {
        console.error("Migration failed:", error.message);
    } finally {
        process.exit();
    }
};

migrate();
