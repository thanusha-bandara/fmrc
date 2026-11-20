import { filterAndSortTests } from '../services/ruleBasedService.js';
import { runGA } from '../services/geneticAlgorithmService.js';
import { getRainyDates } from '../services/weatherService.js';
import { getFarmSeasons, listFarmDailyStatus } from '../models/field.js';
import { getTechnicalAssistants, getTALeaves } from '../models/user.js';
import { getCustomHolidays } from '../models/calendar.js';
import { getSchedulableTests, listSchedules, persistSchedule } from '../models/schedule.js';

export const generateSchedule = async (req, res) => {
    try {
        const tests = await getSchedulableTests();

        if (tests.length === 0) return res.status(200).json({ success: true, message: "No tests to schedule.", schedule: [] });

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
                requiredTA: t.technical_assistant_id || t.machine_responsible_ta || null,
                requiredLabours
            };
        });
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
        const farmDailyStatusArray = await listFarmDailyStatus({});
        const farmDailyStatus = farmDailyStatusArray.reduce((acc, curr) => {
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
        const schedules = await listSchedules();

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