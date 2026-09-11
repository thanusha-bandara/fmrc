import db from '../config/db.js';

// One-off import of the FMRC paper "Master Testing Register" (rows 1-83, photographed by the
// user) into the Machinery table. Transcribed by hand from the photos -- rows 14, 46, 66, 67,
// 81, 82, 83 were skipped (illegible / not filled in on the paper). Safe to re-run: skips a
// row if a machine with the same name+model+supplier+registration_date already exists.
const REGISTER = [
  ['Water pump', 'Solar Surface water pump 4860', 'Green Leaves Trading Co. (pvt) Ltd.', '2019-01-11'],
  ['Brush Cutter', 'Brush Cutter BG 328', 'Lak agro pvt ltd', '2020-11-29'],
  ['Brush Cutter', 'Multi Brush Cutter BG 431', 'Lak agro pvt ltd', '2020-11-30'],
  ['Brush Cutter', '4 Stroke brush cutter BG 438', 'Browns & Company PLC', '2020-08-13'],
  ['Cultivator', 'Mini Tiller MH 710', 'DIMO Engineering', '2020-08-20'],
  ['Seeder', 'Seeder (4W attached) MF 1971MC', 'Jayawardhana Engineering', '2020-08-20'],
  ['Shredder', 'Shredder (4W Attached) SRW45', 'Green Scavenger Technologies (Pvt) Ltd.', '2021-07-12'],
  ['Shredder', 'Shredder SRW 45', 'Sayuni Motors', '2021-08-20'],
  ['Shredder', 'Electric Shredder NV300(M)', 'Nevil Industries (Pvt) Ltd.', '2021-11-19'],
  ['Shredder', '4W Tractor attached shredder NV400(T)', 'Nevil Industries (Pvt) Ltd.', '2021-11-19'],
  ['Spray', 'Electric Sprayer LION HS 16L', 'Browns & Company PLC', '2022-05-27'],
  ['Shredder', 'Shredder', 'Kalana Engineering Technologies', '2022-08-18'],
  ['Transplanter', 'Trans planter', 'DIMO Engineering', '2022-07-21'],
  ['Seeder', 'Roller Seeder SL-D-01', 'Farm lives (pvt) ltd', '2023-09-06'],
  ['Roller Seeder', 'Roller Seeder SL-D-03', 'Farm lives (pvt) ltd', '2023-09-06'],
  ['Water pump', 'Water pump Engine Graves MK20', 'Malli marketing', '2023-09-06'],
  ['Water pump', 'Water pump Engine Graves MK12-2', 'Malli marketing', '2023-09-06'],
  ['Water pump', 'Electric water pump AQCM 220/2', 'Malli marketing', '2023-10-24'],
  ['Water pump', 'Electric water pump AQCM 110/2', 'Malli marketing', '2023-10-24'],
  ['Water pump', 'Electric water pump PUN 1500EH', 'Malli marketing', '2023-10-24'],
  ['Mammoty', 'Mammoty', 'Ali brothers (pvt) ltd', '2024-02-01'],
  ['Tractor', 'Yanmar 358R', 'Lanka Commercial Trading (pvt)', '2024-06-13'],
  ['Seeder', 'Roller seeder HX A048', 'Malli marketing', '2024-06-25'],
  ['Seeder', 'Roller seeder HX A036', 'Malli marketing', '2024-06-25'],
  ['Spray', 'Power spry v2', 'Malli marketing', '2024-06-25'],
  ['Seeder', 'Doubble barrel seeder HX A0004', 'Malli marketing', '2024-06-25'],
  ['Planter', 'Injector planter HX A0029', 'Malli marketing', '2024-06-26'],
  ['Harvesters', 'Ground nut pod separator KT-PS 01', 'Kalana Tech Engineering', '2024-07-01'],
  ['Brush Cutter', 'Brush cutter FM328 2strock', 'Fumax marketing (pvt) ltd', '2024-09-02'],
  ['Brush Cutter', 'Brush cutter BG3328 2strock', 'HZZ Marketing', '2024-09-19'],
  ['Spray', 'Electric sprey SB 16', 'Lankem ceylon plc', '2024-10-24'],
  ['Spray', 'Plastic sprey', 'Lankem ceylon plc', '2024-10-24'],
  ['Harvesters', 'Lovol RG 108', 'DIMO Engineering', '2024-09-02'],
  ['Brush Cutter', 'Brush cutter BG3328 2strock', 'Fine enterprises', '2024-09-02'],
  ['Spray', 'Power spry 769', 'Fine enterprises', '2024-11-13'],
  ['Water pump', 'Engine water pump 2 strock', 'Fine enterprises', '2024-11-13'],
  ['Chaff Cutter', 'Chaff cutter 92-1.5', 'HDB engineering lanka (pvt) ltd', '2024-11-20'],
  ['Tractor', 'Mahindra 585 tech plus 4WD tractor', 'DIMO Engineering', '2024-11-22'],
  ['Tractor', 'Mahindra 575 tech plus 4W tractor', 'DIMO Engineering', '2024-11-22'],
  ['Tractor', 'Mahindra 575 SP plus 4WD tractor', 'DIMO Engineering', '2024-11-22'],
  ['Tractor', 'RV 125-2 2W tractor', 'DIMO Engineering', '2024-08-22'],
  ['Tractor', 'RV 80 2W tractor', 'DIMO Engineering', '2024-08-22'],
  ['Water pump', 'Water pump Greaves kerosine (MK 20 NSP 2x2)', 'Bestech Engineering (pvt) ltd', '2025-01-23'],
  ['Water pump', 'Water pump 2 Diesel Engine (KD170F 2x2 NSP)', 'Bestech Engineering (pvt) ltd', '2025-01-23'],
  ['Brush Cutter', 'HYP 328 A 2 strock', 'Browns & Company PLC', '2025-01-27'],
  ['Harvesters', 'NACA 100 combine harvester', 'Lanka Commercial Trading (pvt) Ltd.', '2025-03-10'],
  ['Brush Cutter', 'BKBG 328', 'Dinapala and Company', '2025-03-20'],
  ['Brush Cutter', 'BG 328', 'Hunter And Company plc', '2025-03-27'],
  ['Spray', '3WF3 mist blower', 'Hunter And Company plc', '2025-03-27'],
  ['Spray', '3W3-6 Power spray', 'Hunter And Company plc', '2025-03-27'],
  ['Spray', 'BS-619', 'Vin Agri business', '2025-04-23'],
  ['Spray', 'BS-6785', 'Vin Agri business', '2025-04-23'],
  ['Spray', 'BS-816D', 'Vin Agri business', '2025-04-23'],
  ['Spray', 'BS-633', 'Vin Agri business', '2025-04-23'],
  ['Spray', 'BS-219', 'Vin Agri business', '2025-04-23'],
  ['Spray', 'NS-1601', 'Vin Agri business', '2025-04-23'],
  ['Spray', 'TF-02', 'Vin Agri business', '2025-04-23'],
  ['Spray', 'TF-05', 'Vin Agri business', '2025-04-23'],
  ['Spray', 'YODAYA', 'Intent Agri business (pvt)', '2025-05-29'],
  ['Mammoty', 'KEC', 'KEC Agricultural', '2025-06-25'],
  ['Brush Cutter', 'WXP-BG-438', 'Browns & Company PLC', '2025-07-17'],
  ['Diesel water pump', '178F 3x3 Nsp', 'Bestech Engineering (pvt) ltd', '2025-07-21'],
  ['Chaff Cutter', '9ZT 1.0A', 'Farm lives (pvt) ltd', '2025-08-05'],
  ['Battery Spray', 'SUS 304 make', 'Piyadasa and sons', '2025-08-06'],
  ['Mist duster', 'KSP 50 (2 in 1)', 'Bestech Engineering (pvt) ltd', '2025-08-07'],
  ['Power spray', '3WR-3A', 'Bestech Engineering (pvt) ltd', '2025-08-07'],
  ['Electric water pump', '20L.767', 'Bestech Engineering (pvt) ltd', '2025-08-07'],
  ['Diesel water pump', 'HF 200/20', 'Bestech Engineering (pvt) ltd', '2025-08-07'],
  ['Roller Seeder', 'GEP 20', 'KDI international', '2025-08-14'],
  ['Power spray', '3DH', 'Prijee International', '2025-09-08'],
  ['Diesel water pump', 'SX233/KP170NSP', '3DH trading', '2025-09-10'],
  ['Electric water pump', 'SXD1552/3', 'Solex technologies', '2025-09-24'],
  ['Hand spray', 'SS V2', 'Malli marketing', '2025-11-27'],
  ['Hand spray', 'SHM 600', 'Shinmax knapsack Spray', '2026-01-20'],
  ['Engine W/P', 'HM PTG 207 NSP', 'Bestech Engineering (Pvt) Ltd', '2026-01-29'],
  ['Brush Cutter', 'BG328-3', '3DH trading', '2026-02-12']
];

const run = async () => {
  let inserted = 0;
  let skipped = 0;
  try {
    for (const [machine_name, model, supplier, registration_date] of REGISTER) {
      const [existing] = await db.query(
        `SELECT machine_id FROM Machinery WHERE machine_name = ? AND model = ? AND supplier = ? AND registration_date = ?`,
        [machine_name, model, supplier, registration_date]
      );
      if (existing.length > 0) {
        skipped++;
        continue;
      }
      await db.query(
        `INSERT INTO Machinery (machine_name, model, supplier, registration_date) VALUES (?, ?, ?, ?)`,
        [machine_name, model, supplier, registration_date]
      );
      inserted++;
    }
    console.log(`Imported ${inserted} machines (${skipped} already present, skipped). Total register rows: ${REGISTER.length}.`);
  } catch (error) {
    console.error("Error importing machinery register:", error.message);
  } finally {
    process.exit();
  }
};

run();
