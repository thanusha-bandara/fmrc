import db from '../config/db.js';
import { filterAndSortTests } from './ruleBasedService.js';
import { runGA } from './geneticAlgorithmService.js';
import { getRainyDates } from './weatherService.js';
import { getCurrentSeason } from '../models/field.js';
import { getTechnicalAssistants, getTALeaves } from '../models/user.js';
import { getCustomHolidays } from '../models/calendar.js';

// Shared by both the manual "Generate Schedule" endpoint and the automatic
// re-scheduling triggered by weather/holiday/resource changes, so a schedule
// computed by the GA is always reflected in GET /api/schedule.
export const persistSchedule = async (testIds, bestSchedule) => {
    if (testIds.length > 0) {
        await db.query(`DELETE FROM Schedules WHERE test_id IN (?) AND status IN ('Scheduled', 'Rescheduled')`, [testIds]);
    }

    for (const [dateStr, assignments] of Object.entries(bestSchedule)) {
        for (const assignment of assignments) {
            await db.query(`
                INSERT INTO Schedules (test_id, assigned_ta_id, scheduled_date, time_slot, status)
                VALUES (?, ?, ?, ?, 'Scheduled')
            `, [
                assignment.test.test_id,
                assignment.assigned_ta_id,
                assignment.scheduled_date,
                assignment.time_slot
            ]);
        }
    }
};

export const runAutomaticScheduling = async () => {
    try {
        console.log("Starting automatic rescheduling...");

        // 1. Fetch pending and currently 'Scheduled' / 'Rescheduled' tests
        const [tests] = await db.query(`
            SELECT 
                tr.test_id, 
                tr.test_name, 
                tr.is_field_test,
                tr.requires_water,
                tr.required_season,
                tr.technical_assistant_id, 
                m.registration_date as registrationDate,
                m.machine_name,
                s.schedule_id
            FROM Test_Records tr 
            JOIN Machinery m ON tr.machine_id = m.machine_id 
            LEFT JOIN Schedules s ON tr.test_id = s.test_id 
            WHERE s.test_id IS NULL OR s.status IN ('Scheduled', 'Rescheduled', 'Cancelled')
        `);

        if (tests.length === 0) {
            console.log("No tests to schedule.");
            return;
        }

        const pendingTests = tests.map(t => {
            return {
                test_id: t.test_id,
                test_name: t.test_name,
                registrationDate: t.registrationDate,
                machineName: t.machine_name,
                isFieldTest: Boolean(t.is_field_test),
                requiredSeason: t.required_season || "Any",
                requiresWater: Boolean(t.requires_water),
                requiredTA: t.technical_assistant_id || null
            };
        });

        // 2. Fetch constraints
        const currentSeason = await getCurrentSeason();
        const filteredTests = filterAndSortTests(pendingTests, currentSeason);
        
        const tas = await getTechnicalAssistants();
        const taLeaves = await getTALeaves();
        const rainyDates = await getRainyDates();
        
        // Fetch all holidays from database (public holidays are synced here too)
        const allHolidays = await getCustomHolidays();

        // Fetch daily farm statuses (field closed/water available overrides)
        const farmDailyStatusArray = await db.query(`SELECT date, is_field_available, is_water_available FROM farm_daily_status`);
        const farmDailyStatus = farmDailyStatusArray[0].reduce((acc, curr) => {
            const dateStr = typeof curr.date === 'string' ? curr.date.split("T")[0] : curr.date.toISOString().split("T")[0];
            acc[dateStr] = curr;
            return acc;
        }, {});

        // 3. Run Genetic Algorithm
        const bestSchedule = runGA(filteredTests, rainyDates, [], tas, allHolidays, taLeaves, farmDailyStatus);

        // 4. Save to Database (replaces old 'Scheduled'/'Rescheduled' rows for these tests)
        const testIds = tests.map(t => t.test_id);
        await persistSchedule(testIds, bestSchedule);

        console.log("Automatic rescheduling completed successfully!");

    } catch (error) {
        console.error("Automatic rescheduling failed:", error.message);
    }
};
