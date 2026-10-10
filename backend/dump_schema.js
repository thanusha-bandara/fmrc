import db from './config/db.js';
const run = async () => {
  try {
    const [tables] = await db.query('SHOW TABLES');
    for (let t of tables) {
      const tableName = Object.values(t)[0];
      const [cols] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
      console.log(`\n--- Table: ${tableName} ---`);
      cols.forEach(c => console.log(`${c.Field} (${c.Type}) - ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${c.Default ? 'DEFAULT ' + c.Default : ''}`));
    }
  } catch(e) { console.error(e); }
  process.exit(0);
};
run();
