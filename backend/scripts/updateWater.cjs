const mysql = require('mysql2/promise');
async function run() {
    const con = await mysql.createConnection({host:'127.0.0.1', user:'root', password:'1234', database:'fmrc_db'});
    
    // Update Four Wheel Tractor tests to require water (except Lab Test)
    await con.query(`UPDATE Test_Records SET requires_water = 1 WHERE catalog_key = 'FOUR_WHEEL_TRACTOR' AND test_name != 'Lab Test - Dimensions & Specifications'`);
    
    console.log('Updated existing test records water requirements');
    process.exit(0);
}
run().catch(console.error);
