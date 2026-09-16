const mysql = require('mysql2/promise');

async function run() {
    const con = await mysql.createConnection({host:'127.0.0.1', user:'root', password:'1234', database:'fmrc_db'});
    
    // Find tractor 3
    const [rows] = await con.query("SELECT machine_id FROM Machinery WHERE machine_name = 'tractor3'");
    if (rows.length === 0) {
        console.log("tractor 3 not found");
        process.exit(1);
    }
    const machineId = rows[0].machine_id;

    // Update all tests for tractor 3 to be completed and approved
    await con.query(`
        UPDATE Test_Records 
        SET 
            status = 'Approved', 
            form_data = '{}',
            submitted_at = NOW(),
            mechanical_engineer_id = 1,
            reviewed_at = NOW(),
            me_recommendation = 'Recommended',
            me_comments = 'Dummy approval for testing report generation'
        WHERE machine_id = ?
    `, [machineId]);
    
    console.log('Successfully populated dummy test data for tractor 3.');
    process.exit(0);
}

run().catch(console.error);
