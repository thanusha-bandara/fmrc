import db from '../config/db.js';
import { SCHEMA_DEFINITIONS } from './testSchemaDefinitions.js';

// Pushes the 5 structured form schemas (LAB/SPEED/HIGHLAND/LOWLAND/TRANSPORT) into
// Test_Form_Schemas. Safe to re-run: updates each row in place by schema_key, so editing
// testSchemaDefinitions.js and re-running this script is how a data-sheet layout change
// reaches the running app, with no backend redeploy.
const run = async () => {
  try {
    for (const key of Object.keys(SCHEMA_DEFINITIONS)) {
      const def = SCHEMA_DEFINITIONS[key];
      await db.query(
        `INSERT INTO Test_Form_Schemas (schema_key, label, formula_set, schema_json)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE label = VALUES(label), formula_set = VALUES(formula_set), schema_json = VALUES(schema_json)`,
        [def.key, def.label, def.key, JSON.stringify(def.sections)]
      );
      console.log(`Seeded schema: ${def.key}`);
    }
    console.log(`Successfully seeded ${Object.keys(SCHEMA_DEFINITIONS).length} test form schemas.`);
  } catch (error) {
    console.error("Error seeding test schemas:", error.message);
  } finally {
    process.exit();
  }
};

run();
