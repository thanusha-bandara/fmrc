
import pool from './config/db.js';

const newLabours = [
  'Mr. W.G.P.S. Abeyrathna',
  'Mr. D.P.T.K. Dissanayake',
  'Mr. R.M.A.K. Senevirathna',
  'Mr. R.H.M.T. Rajakaruna',
  'Mr. W.A.A.N. Weerakkody'
];

function getLaboursForMachine(machineName) {
    if (!machineName) return [];
    const name = machineName.toLowerCase();
    
    // Group 1: Rajakaruna + Abeyrathna + Dissanayake + Senevirathna (2/4 Wheel Tractors)
    if (name.includes('2 wheel tractor') || name.includes('4 wheel tractor') || name.includes('four wheel tractor') || name.includes('tractor implements')) {
        return [4, 1, 2, 3]; // Rajakaruna, Abeyrathna, Dissanayake, Senevirathna
    }
    
    // Group 2: Abeyrathna + Dissanayake + Senevirathna + Weerakkody (Water pumps)
    if (name.includes('water pump') || name.includes('engine w/p')) {
        return [1, 2, 3, 5];
    }
    
    // Group 3: Dissanayake only (Hand tools)
    if (name.includes('hand tool') || name.includes('mammoty')) {
        return [2];
    }

    // Group 4: Abeyrathna + Dissanayake + Senevirathna (Seeders, Transplanters, Harvesters, Threshers, Reapers, Brush cutters, etc.)
    return [1, 2, 3];
}

async function run() {
  try {
    // 1. Recreate Labours
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('TRUNCATE TABLE Labours');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    
    for (const name of newLabours) {
      await pool.query('INSERT INTO Labours (name, is_active) VALUES (?, 1)', [name]);
    }
    console.log('Inserted real labours.');

    // 2. Add required_labours column to Machinery if it doesn\'t exist
    try {
      await pool.query('ALTER TABLE Machinery ADD COLUMN required_labours JSON DEFAULT NULL');
      console.log('Added required_labours column.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('required_labours already exists.');
      } else {
        throw e;
      }
    }

    // 3. Update existing machines with their specific skilled labours
    const [machines] = await pool.query('SELECT machine_id, machine_name FROM Machinery');
    for (const m of machines) {
      const laboursArr = getLaboursForMachine(m.machine_name);
      await pool.query('UPDATE Machinery SET required_labours = ? WHERE machine_id = ?', [JSON.stringify(laboursArr), m.machine_id]);
    }
    console.log('Updated existing machines with skilled labours.');

  } catch (error) {
    console.error(error);
  }
  process.exit();
}
run();

