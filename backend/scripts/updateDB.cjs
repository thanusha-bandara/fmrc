const mysql = require('mysql2/promise');
async function run() {
    const con = await mysql.createConnection({host:'127.0.0.1', user:'root', password:'1234', database:'fmrc_db'});
    
    // Update Four Wheel Tractor field tests
    await con.query(`UPDATE Test_Records SET required_season = 'Ploughing' WHERE catalog_key = 'FOUR_WHEEL_TRACTOR' AND is_field_test = 1`);
    
    // Update Combine Harvester field tests
    await con.query(`UPDATE Test_Records SET required_season = 'Harvesting' WHERE catalog_key = 'COMBINE_HARVESTER' AND is_field_test = 1`);
    
    console.log('Updated existing test records');
    process.exit(0);
}
run().catch(console.error);
