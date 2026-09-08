import db from '../config/db.js';

const seed = async () => {
  try {
    console.log("Seeding dummy data...");

    // Insert Machinery
    const machines = [
      ['Kubota B2441', 'B2441', 'Kubota Lanka', '2026-08-01'],
      ['Mahindra 575 DI', '575 DI', 'DIMO', '2026-08-05'],
      ['Sonalika DI 42', 'DI 42', 'Sonalika Tractors', '2026-08-10']
    ];

    for (let m of machines) {
      await db.query(
        `INSERT INTO Machinery (machine_name, model, supplier, registration_date) VALUES (?, ?, ?, ?)`,
        m
      );
    }
    console.log("Machinery seeded.");

    // Insert Field Status (Needed for Schedules)
    await db.query(`INSERT INTO Field_Status (field_name, is_available, water_available, season) VALUES ('Field A', true, true, 'Yala')`);
    
    // Insert Test Records
    // TA (user_id = 2) Draft tests
    await db.query(
      `INSERT INTO Test_Records (machine_id, test_name, technical_assistant_id, status, form_data) VALUES (1, 'Engine Performance Test', 2, 'Draft', '{}')`
    );
    await db.query(
      `INSERT INTO Test_Records (machine_id, test_name, technical_assistant_id, status, form_data) VALUES (2, 'Fuel Consumption Test', 2, 'Draft', '{}')`
    );

    // TA Submitted Tests (Ready for ME)
    await db.query(
      `INSERT INTO Test_Records (machine_id, test_name, technical_assistant_id, status, form_data) VALUES (1, 'PTO Power Test', 2, 'Submitted', '{"Power": "25HP", "RPM": "540"}')`
    );
    await db.query(
      `INSERT INTO Test_Records (machine_id, test_name, technical_assistant_id, status, form_data) VALUES (3, 'Drawbar Pull Test', 2, 'Submitted', '{"Pull": "1200kg"}')`
    );

    // ME Reviewed Tests (Ready for CE)
    await db.query(
      `INSERT INTO Test_Records (machine_id, test_name, technical_assistant_id, mechanical_engineer_id, me_recommendation, status, form_data) VALUES (2, 'Brake Test', 2, 3, 'Recommended', 'Reviewed', '{"Stopping Distance": "5m"}')`
    );
    await db.query(
      `INSERT INTO Test_Records (machine_id, test_name, technical_assistant_id, mechanical_engineer_id, me_recommendation, status, form_data) VALUES (3, 'Steering Test', 2, 3, 'Not Recommended', 'Reviewed', '{"Turning Radius": "3m"}')`
    );

    // CE Approved Tests (Completed)
    await db.query(
      `INSERT INTO Test_Records (machine_id, test_name, technical_assistant_id, mechanical_engineer_id, chief_engineer_id, me_recommendation, status, form_data) VALUES (1, 'Hydraulic Lift Test', 2, 3, 4, 'Recommended', 'Approved', '{"Lift Capacity": "800kg"}')`
    );

    console.log("Test Records seeded.");

    // Insert Schedules for all tests to assign them to TA (user 2)
    // test_ids will be 1 through 7 assuming clean DB. Let's just grab them.
    const [tests] = await db.query(`SELECT test_id FROM Test_Records`);
    for (let i = 0; i < tests.length; i++) {
      await db.query(
        `INSERT INTO Schedules (test_id, field_id, assigned_ta_id, scheduled_date, time_slot, status) VALUES (?, 1, 2, '2026-08-30', 'Morning', 'Completed')`,
        [tests[i].test_id]
      );
    }
    console.log("Schedules seeded.");

    console.log("Data seeding complete!");
  } catch (error) {
    console.error("Error seeding data:", error);
  } finally {
    process.exit();
  }
};

seed();
