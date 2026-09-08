import db from '../config/db.js';

const seedBulk = async () => {
  try {
    console.log("Seeding bulk tests...");
    
    // We will add 30 tests spread across the 3 machines.
    // We will mix is_field_test, requires_water, required_season.
    
    const testNames = [
      "Engine Performance", "PTO Power", "Drawbar Pull", 
      "Hydraulic Lift", "Brake Performance", "Steering Check",
      "Noise Level", "Vibration Test", "Fuel Efficiency",
      "Turning Radius", "Water Pump Flow Rate", "Continuous Operation"
    ];

    let inserted = 0;
    
    for (let i = 0; i < 30; i++) {
      const machine_id = (i % 3) + 1; // 1, 2, 3
      const test_name = testNames[i % testNames.length] + ` (Bulk #${i+1})`;
      const is_field_test = Math.random() > 0.3; // 70% chance of field test
      const requires_water = is_field_test && Math.random() > 0.5;
      const seasons = ['Any', 'Yala', 'Maha'];
      const required_season = seasons[Math.floor(Math.random() * seasons.length)];
      
      // Technical assistant will be assigned by GA? No, GA assigns TA to SCHEDULE.
      // But Test_Records.technical_assistant_id is the TA requesting it? Wait, FMRC says Admin assigns TA.
      // In FMRC backend, `requiredTA: t.technical_assistant_id || null`.
      // Let's leave technical_assistant_id as NULL or 2. We'll set it to NULL so GA can pick any TA,
      // OR set to 2 to force TA user_id=2. I'll set to 2 for half, NULL for half.
      const ta_id = i % 2 === 0 ? 2 : null;
      
      await db.query(
        `INSERT INTO Test_Records 
          (machine_id, test_name, is_field_test, requires_water, required_season, technical_assistant_id, status, form_data) 
         VALUES (?, ?, ?, ?, ?, ?, 'Draft', '{}')`,
        [machine_id, test_name, is_field_test, requires_water, required_season, ta_id]
      );
      inserted++;
    }
    
    console.log(`Successfully added ${inserted} pending tests!`);
    
  } catch (error) {
    console.error("Error seeding bulk tests:", error);
  } finally {
    process.exit();
  }
};

seedBulk();
