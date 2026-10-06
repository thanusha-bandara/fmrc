import { filterAndSortTests } from '../services/ruleBasedService.js';
import { runGA } from '../services/geneticAlgorithmService.js';
import { getRainyDates } from '../services/weatherService.js';
import { getFarmSeasons } from '../models/field.js';
import { getTechnicalAssistants, getTALeaves } from '../models/user.js';
import { getCustomHolidays } from '../models/calendar.js';
import { persistSchedule } from '../services/autoScheduleService.js';
import db from '../config/db.js';

export const generateSchedule = async (req, res) => {
    try {
        const [tests] = await db.query(`
            SELECT tr.test_id, tr.test_name, tr.is_field_test, tr.requires_water, tr.required_season, tr.technical_assistant_id, m.registration_date as registrationDate, m.machine_name, MAX(s.schedule_id) as schedule_id
            FROM Test_Records tr JOIN Machinery m ON tr.machine_id = m.machine_id LEFT JOIN Schedules s ON tr.test_id = s.test_id WHERE s.test_id IS NULL OR s.status IN ('Scheduled', 'Rescheduled') GROUP BY tr.test_id
        `);

        if (tests.length === 0) return res.status(200).json({ success: true, message: "No tests to schedule.", schedule: [] });

        const pendingTests = tests.map(t => ({ test_id: t.test_id, test_name: t.test_name, registrationDate: t.registrationDate, machineName: t.machine_name, isFieldTest: Boolean(t.is_field_test), requiredSeason: t.required_season || "Any", requiresWater: Boolean(t.requires_water), requiredTA: t.technical_assistant_id || null }));
        const allSeasons = await getFarmSeasons();
        const filteredTests = filterAndSortTests(pendingTests, allSeasons);

        // Fetch active Technical Assistants
        const tas = await getTechnicalAssistants();
        const taLeaves = await getTALeaves();

        // Fetch rainy dates from OpenWeatherMap API
        const rainyDates = await getRainyDates();

        // Fetch holidays from database
        const allHolidays = await getCustomHolidays();

        // Fetch daily farm statuses
        const farmDailyStatusArray = await db.query(`SELECT date, is_field_available, is_water_available FROM farm_daily_status`);
        const farmDailyStatus = farmDailyStatusArray[0].reduce((acc, curr) => {
            const dateStr = typeof curr.date === 'string' ? curr.date.split("T")[0] : curr.date.toISOString().split("T")[0];
            acc[dateStr] = curr;
            return acc;
        }, {});

        const gaResult = runGA(filteredTests, rainyDates, [], tas, allHolidays, taLeaves, farmDailyStatus, allSeasons);
        const finalSchedule = gaResult.schedule;

        // Persist so GET /api/schedule reflects the newly generated calendar
        const testIds = filteredTests.map(t => t.test_id);
        await persistSchedule(testIds, finalSchedule);

        res.status(200).json({
            success: true,
            message: "schedule generated successfully",
            originalCount: pendingTests?.length || 0,
            filteredCount: filteredTests.length,
            schedule: finalSchedule
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "error generating schedule",
            error: error.message
        });
    }
};

export const getSchedules = async (req, res) => {
    try {
        const [schedules] = await db.query(`
            SELECT 
                s.schedule_id,
                s.scheduled_date,
                s.time_slot,
                s.status,
                t.test_name,
                t.is_field_test,
                m.machine_name,
                u.full_name as assigned_ta_name
            FROM Schedules s
            JOIN Test_Records t ON s.test_id = t.test_id
            JOIN Machinery m ON t.machine_id = m.machine_id
            LEFT JOIN Users u ON s.assigned_ta_id = u.user_id
            ORDER BY s.scheduled_date ASC, s.time_slot ASC
        `);

        res.status(200).json({
            success: true,
            schedules
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching schedules",
            error: error.message
        });
    }
};