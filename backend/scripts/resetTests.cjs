const mysql = require('mysql2/promise');
async function run() {
    const con = await mysql.createConnection({host:'127.0.0.1', user:'root', password:'1234', database:'fmrc_db'});
    
    // Clear Reports
    await con.query(`DELETE FROM Reports`);
    
    // Clear Schedules
    await con.query(`DELETE FROM Schedules`);
    
    // Reset all Test Records back to Draft and clear form data
    await con.query(`
        UPDATE Test_Records 
        SET status = 'Draft', 
            form_data = NULL,
            submitted_at = NULL,
            reviewed_at = NULL,
            approved_at = NULL,
            mechanical_engineer_id = NULL,
            chief_engineer_id = NULL,
            me_recommendation = NULL,
            me_comments = NULL,
            ce_comments = NULL,
            include_in_final_report = FALSE
    `);
    
    console.log('Database tests have been reset to fresh state.');
    process.exit(0);
}
run().catch(console.error);
