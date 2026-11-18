import { filterAndSortTests } from './ruleBasedService.js';
import { runGA } from './geneticAlgorithmService.js';
import { getRainyDates } from './weatherService.js';
import { getFarmSeasons, listFarmDailyStatus } from '../models/field.js';
import { getTechnicalAssistants, getTALeaves } from '../models/user.js';
import { getCustomHolidays } from '../models/calendar.js';
import { getLabourLeaves } from '../models/labour.js';
import { getSchedulableTests, persistSchedule } from '../models/schedule.js';

export const runAutomaticScheduling = async () => {
    try {
        console.log("Starting automatic rescheduling...");

        // 1. Fetch pending and currently 'Scheduled' / 'Rescheduled' tests
        const tests = await getSchedulableTests();

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
        const labourLeaves = await getLabourLeaves();

        // Fetch daily farm statuses (field closed/water available overrides)
        const farmDailyStatusArray = await listFarmDailyStatus({});
        const farmDailyStatus = farmDailyStatusArray.reduce((acc, curr) => {
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
