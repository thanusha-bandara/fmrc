import db from './config/db.js';

const run = async () => {
  try {
    const [fks] = await db.query(`
      SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_NAME = 'field_status';
    `);
    
    if (fks.length > 0) {
        console.log('Foreign Keys referencing field_status:', fks);
        for (let fk of fks) {
            console.log(`Dropping FK ${fk.CONSTRAINT_NAME} from ${fk.TABLE_NAME}`);
            await db.query(`ALTER TABLE ${fk.TABLE_NAME} DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
        }
    }

    await db.query('DROP TABLE IF EXISTS field_status');
    console.log('Table field_status dropped successfully.');
    
  } catch(e) {
    console.error('Error:', e);
  }
  process.exit(0);
};

run();
