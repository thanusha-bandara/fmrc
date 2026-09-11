import db from '../config/db.js';
import { CATALOGS } from '../config/standardTestCatalog.js';

// Adds any catalog entries not yet present for a machine (matched by test_name), without
// touching existing tests. Useful after a catalog gains a new entry (e.g. the Endurance Test
// added to FOUR_WHEEL_TRACTOR) so already-generated machines can catch up without duplicating
// everything via bulkCreateStandardTestRecords. Usage:
// `node scripts/sync_catalog_tests.js <machineId> <catalogKey>`
const run = async () => {
  const machineId = Number(process.argv[2]);
  const catalogKey = process.argv[3];
  const catalog = CATALOGS[catalogKey];
  if (!machineId || !catalog) {
    console.error('Usage: node scripts/sync_catalog_tests.js <machineId> <catalogKey>');
    console.error(`Valid catalog keys: ${Object.keys(CATALOGS).join(', ')}`);
    process.exit(1);
  }

  try {
    const [existingRows] = await db.query('SELECT test_id, test_name, group_key FROM Test_Records WHERE machine_id = ?', [machineId]);
    const existingByName = new Map(existingRows.map((r) => [r.test_name, r]));

    // Backfill group_key on already-existing rows created before this catalog entry had one
    // (e.g. the 15 Highland/Lowland tests generated before group_key existed).
    let backfilled = 0;
    for (const entry of catalog) {
        if (!entry.group_key) continue;
        const row = existingByName.get(entry.test_name);
        if (row && !row.group_key) {
            await db.query('UPDATE Test_Records SET group_key = ? WHERE test_id = ?', [entry.group_key, row.test_id]);
            backfilled++;
        }
    }
    if (backfilled > 0) console.log(`Backfilled group_key on ${backfilled} existing test(s).`);

    const missing = catalog.filter((entry) => !existingByName.has(entry.test_name));

    if (missing.length === 0) {
      console.log('Nothing further to sync -- all catalog tests already exist for this machine.');
      process.exit();
    }

    const [schemaRows] = await db.query('SELECT schema_id, schema_key FROM Test_Form_Schemas');
    const schemaIdByKey = {};
    schemaRows.forEach((row) => { schemaIdByKey[row.schema_key] = row.schema_id; });

    for (const entry of missing) {
      await db.query(
        `INSERT INTO Test_Records (machine_id, test_name, is_field_test, requires_water, required_season, schema_id, group_key, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Draft')`,
        [
          machineId,
          entry.test_name,
          entry.is_field_test,
          entry.requires_water,
          entry.required_season,
          schemaIdByKey[entry.schema_key] || null,
          entry.group_key || null
        ]
      );
      console.log(`Added: ${entry.test_name}`);
    }
    console.log(`Synced ${missing.length} missing test(s) for machine_id=${machineId}.`);
  } catch (error) {
    console.error('Sync failed:', error.message);
  } finally {
    process.exit();
  }
};

run();
