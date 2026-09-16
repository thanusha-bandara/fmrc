import { filterAndSortTests } from '../services/ruleBasedService.js';
import { runGA } from '../services/geneticAlgorithmService.js';
import { getRainyDates } from '../services/weatherService.js';
import { getCurrentSeason } from '../models/field.js';
import { getTechnicalAssistants, getTALeaves } from '../models/user.js';
import { getActiveLabourCount, getLabourLeaves } from '../models/labour.js';
import { getPendingTests } from '../models/testRecord.js';
import { getCustomHolidays } from '../models/calendar.js';
import { persistSchedule } from '../services/autoScheduleService.js';
import db from '../config/db.js';

export const generateSchedule = async (req, res) => {
    try {
        // Fetch all required data directly from the database models
        const pendingTests = await getPendingTests();
        const currentSeason = await getCurrentSeason();

        const filteredTests = filterAndSortTests(pendingTests, currentSeason);

        // Fetch active Technical Assistants
        const tas = await getTechnicalAssistants();
        const taLeaves = await getTALeaves();
        const totalLabourCount = await getActiveLabourCount();
        const labourLeaves = await getLabourLeaves();

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

        const finalSchedule = runGA(filteredTests, rainyDates, [], tas, allHolidays, taLeaves, farmDailyStatus);

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