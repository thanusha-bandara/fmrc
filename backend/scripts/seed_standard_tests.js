import { bulkCreateStandardTestRecords } from '../models/testRecord.js';

// Backfills a machine type's standard test set for an existing machine. Usage:
// `npm run seed:standard-tests` (machine_id 1, FOUR_WHEEL_TRACTOR) or
// `npm run seed:standard-tests -- 2 COMBINE_HARVESTER` (machine_id 2, that catalog).
const run = async () => {
  const machineId = Number(process.argv[2]) || 1;
  const catalogKey = process.argv[3] || 'FOUR_WHEEL_TRACTOR';
  try {
    console.log(`Seeding standard test set (${catalogKey}) for machine_id=${machineId}...`);
    const tests = await bulkCreateStandardTestRecords(machineId, catalogKey);
    console.log(`Successfully created ${tests.length} standard tests for machine_id=${machineId}.`);
  } catch (error) {
    console.error("Error seeding standard tests:", error.message);
  } finally {
    process.exit();
  }
};

run();
