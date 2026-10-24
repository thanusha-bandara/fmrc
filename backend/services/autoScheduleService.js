import db from '../config/db.js';
import { filterAndSortTests } from './ruleBasedService.js';
import { runGA } from './geneticAlgorithmService.js';
import { getRainyDates } from './weatherService.js';
import { getFarmSeasons } from '../models/field.js';
import { getTechnicalAssistants, getTALeaves } from '../models/user.js';
import { getCustomHolidays } from '../models/calendar.js';

export const persistSchedule = async (testIds, bestSchedule) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        if (testIds.length > 0) {
            await connection.query(`DELETE FROM Schedules WHERE test_id IN (?) AND status IN ('Scheduled', 'Rescheduled')`, [testIds]);
        }

        for (const [dateStr, assignments] of Object.entries(bestSchedule)) {
            for (const assignment of assignments) {
                await connection.query(`
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

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        console.error("Error in persistSchedule:", error.message);
        throw error;
    } finally {
        connection.release();
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
                m.responsible_ta_id as machine_responsible_ta,
                m.required_labours,
                MAX(s.schedule_id) as schedule_id
            FROM Test_Records tr 
            JOIN Machinery m ON tr.machine_id = m.machine_id 
            LEFT JOIN Schedules s ON tr.test_id = s.test_id 
            WHERE (s.test_id IS NULL OR s.status IN ('Scheduled', 'Rescheduled', 'Cancelled'))
              AND tr.status = 'Draft'
              AND COALESCE(m.is_on_hold, 0) = 0
            GROUP BY tr.test_id
        `);

        if (tests.length === 0) {
            console.log("No tests to schedule.");
            return;
        }

        const pendingTests = tests.map(t => {
            let requiredLabours = [];
            if (t.required_labours) {
                try { requiredLabours = typeof t.required_labours === 'string' ? JSON.parse(t.required_labours) : t.required_labours; } catch(e) {}
            }
            
            return {
                test_id: t.test_id,
                test_name: t.test_name,
                registrationDate: t.registrationDate,
                machineName: t.machine_name,
                isFieldTest: Boolean(t.is_field_test),
                requiredSeason: t.required_season || "Any",
                requiresWater: Boolean(t.requires_water),
                requiredTA: t.technical_assistant_id || t.machine_responsible_ta,
                requiredLabours: requiredLabours
            };
        });

        // 2. Fetch constraints
        const allSeasons = await getFarmSeasons();
        const filteredTests = filterAndSortTests(pendingTests, allSeasons);
        
        const tas = await getTechnicalAssistants();
        const taLeaves = await getTALeaves();
        const rainyDates = await getRainyDates();
        
        // Fetch all holidays from database (public holidays are synced here too)
        const allHolidays = await getCustomHolidays();
        
        // Fetch labour leaves
        const [labourLeavesArray] = await db.query(`SELECT labour_id, DATE_FORMAT(date, '%Y-%m-%d') as leave_date FROM labour_availability WHERE is_on_leave = TRUE`);
        const labourLeaves = labourLeavesArray || [];

        // Fetch daily farm statuses (field closed/water available overrides)
        const farmDailyStatusArray = await db.query(`SELECT date, is_field_available, is_water_available FROM farm_daily_status`);
        const farmDailyStatus = farmDailyStatusArray[0].reduce((acc, curr) => {
            const dateStr = typeof curr.date === 'string' ? curr.date.split("T")[0] : curr.date.toISOString().split("T")[0];
            acc[dateStr] = curr;
            return acc;
        }, {});

        // 3. Run Genetic Algorithm
        const gaResult = runGA(filteredTests, rainyDates, [], tas, allHolidays, taLeaves, farmDailyStatus, allSeasons, labourLeaves);
        const bestSchedule = gaResult.schedule;

        // 4. Save to Database (replaces old 'Scheduled'/'Rescheduled' rows for these tests)
        const testIds = tests.map(t => t.test_id);
        await persistSchedule(testIds, bestSchedule);

        console.log("Automatic rescheduling completed successfully!");

    } catch (error) {
        console.error("Automatic rescheduling failed:", error.message);
    }
};
