import db from '../config/db.js';
import { getRainyDates } from './weatherService.js';
import { getFarmSeasons } from '../models/field.js';

/**
 * FMRC Rule-Based Predictive Estimation Module
 * 
 * Rules:
 * Total Estimated Duration = Standard Benchmark + Queue Delay (1 test = 1 day) + Seasonal Wait Delay + Weather Buffer
 * 
 * 1. Benchmark: Standard processing duration per machine category.
 * 2. Queue Delay: Exactly 1 day delay per active pending test in queue.
 * 3. Seasonal Wait Delay: If machine requires a season (e.g. Harvesting or Ploughing) and current date is outside that season,
 *    adds the exact days until the next season window opens.
 * 4. Weather Buffer: 1 day per forecasted rainy day (for field tests).
 */

export const INSTITUTIONAL_BENCHMARKS = {
    FOUR_WHEEL_TRACTOR: 11,
    TRACTOR: 11,
    "4-WHEEL TRACTOR": 11,
    COMBINE_HARVESTER: 12,
    HARVESTER: 12,
    HARVESTERS: 12,
    SEEDER_SEED_ONLY: 7,
    SEEDER_WITH_FERTILIZER: 8,
    SEEDER: 8,
    DISC_PLOUGH: 5,
    "DISC PLOUGH": 5,
    ROTARY_TILLER: 6,
    "ROTARY TILLER": 6,
    SHREDDER: 4,
    BRUSH_CUTTER: 7,
    "BRUSH CUTTER": 7,
    WATER_PUMP: 5,
    "WATER PUMP": 5,
    SPRAY: 4,
    CULTIVATOR: 6,
    CHAFF_CUTTER: 5,
    TRANSPLANTER: 7,
    DEFAULT: 7
};

/**
 * Resolves standard benchmark duration in days.
 */
export const getStandardBenchmarkDuration = (machineName = '', catalogKey = '') => {
    if (catalogKey) {
        const normalizedCatalog = String(catalogKey).toUpperCase().trim();
        if (INSTITUTIONAL_BENCHMARKS[normalizedCatalog]) {
            return INSTITUTIONAL_BENCHMARKS[normalizedCatalog];
        }
    }

    const normalizedName = String(machineName).toUpperCase().trim();
    for (const [key, days] of Object.entries(INSTITUTIONAL_BENCHMARKS)) {
        if (normalizedName.includes(key.replace(/_/g, ' '))) {
            return days;
        }
    }

    return INSTITUTIONAL_BENCHMARKS.DEFAULT;
};

/**
 * Workload Delay Rule:
 * Exactly 1 day delay per active pending test in the queue (Draft, Submitted, Reviewed).
 */
export const calculateWorkloadDelay = (pendingQueueCount = 0) => {
    return Math.max(0, Number(pendingQueueCount) || 0);
};

/**
 * Resolves the required season type for a machine.
 * Harvesters require 'Harvesting', Tractors/Seeders/Ploughs require 'Ploughing', etc.
 */
export const getRequiredSeasonForMachine = (machineName = '', catalogKey = '') => {
    const combined = `${machineName} ${catalogKey}`.toUpperCase();
    if (combined.includes('HARVEST')) return 'Harvesting';
    if (combined.includes('TRACTOR') || combined.includes('SEEDER') || combined.includes('PLOUGH') || combined.includes('TILLER')) {
        return 'Ploughing';
    }
    return 'Any';
};

/**
 * Calculates days to wait until the next eligible season starts.
 * If currently within season or season is 'Any', delay is 0.
 */
export const calculateSeasonalWaitDelay = (requiredSeason = 'Any', currentDate = new Date(), allSeasons = []) => {
    if (!requiredSeason || requiredSeason === 'Any' || !Array.isArray(allSeasons) || allSeasons.length === 0) {
        return 0;
    }

    const now = new Date(currentDate);
    now.setHours(0, 0, 0, 0);

    // Check if current date falls within any active season window of that type
    const isActive = allSeasons.some(s => {
        if (s.season_type !== requiredSeason) return false;
        const start = new Date(s.start_date);
        const end = new Date(s.end_date);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return now >= start && now <= end;
    });

    if (isActive) {
        return 0; // Season is active right now
    }

    // Find the next upcoming season window for this season type
    const futureSeasons = allSeasons
        .filter(s => s.season_type === requiredSeason && new Date(s.start_date) > now)
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    if (futureSeasons.length > 0) {
        const nextStart = new Date(futureSeasons[0].start_date);
        nextStart.setHours(0, 0, 0, 0);
        const diffMs = nextStart.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    }

    return 0;
};

/**
 * Weather buffer rule: 1 day per forecasted rainy day (for field tests).
 */
export const calculateWeatherBuffer = (rainyDaysCount = 0, isFieldTest = true) => {
    if (!isFieldTest) return 0;
    const count = Math.max(0, Number(rainyDaysCount) || 0);
    return Math.min(10, count);
};

/**
 * Pure calculation logic.
 */
export const computeEstimation = ({
    machineId = null,
    machineName = "4-Wheel Tractor",
    catalogKey = null,
    requiredSeason = null,
    isFieldTest = true,
    baseDate = new Date(),
    queueCount = 0,
    rainyDaysCount = 0,
    allSeasons = [],
    workloadDelayOverride = null,
    weatherBufferOverride = null,
    seasonalDelayOverride = null
} = {}) => {
    const standardDuration = getStandardBenchmarkDuration(machineName, catalogKey);
    const season = requiredSeason || getRequiredSeasonForMachine(machineName, catalogKey);

    // 1 test = 1 day queue delay
    const workloadDelay = workloadDelayOverride !== null && workloadDelayOverride !== undefined
        ? Math.max(0, Number(workloadDelayOverride))
        : calculateWorkloadDelay(queueCount);

    const seasonalDelay = seasonalDelayOverride !== null && seasonalDelayOverride !== undefined
        ? Math.max(0, Number(seasonalDelayOverride))
        : calculateSeasonalWaitDelay(season, baseDate, allSeasons);

    const weatherBuffer = weatherBufferOverride !== null && weatherBufferOverride !== undefined
        ? Math.max(0, Number(weatherBufferOverride))
        : calculateWeatherBuffer(rainyDaysCount, isFieldTest);

    const estimatedDuration = standardDuration + workloadDelay + seasonalDelay + weatherBuffer;

    const startDate = baseDate ? new Date(baseDate) : new Date();
    const targetDate = new Date(startDate.getTime());
    targetDate.setDate(targetDate.getDate() + estimatedDuration);

    const baseDateFormatted = startDate.toISOString().split('T')[0];
    const estimatedCompletionDate = targetDate.toISOString().split('T')[0];

    return {
        machineId,
        machineName,
        catalogKey: catalogKey || null,
        requiredSeason: season,
        isFieldTest: Boolean(isFieldTest),
        standardDuration,
        workloadDelay,
        seasonalDelay,
        weatherBuffer,
        estimatedDuration,
        baseDate: baseDateFormatted,
        estimatedCompletionDate,
        queueCount,
        rainyDaysCount,
        breakdown: {
            standard: `${standardDuration} days (${machineName} benchmark)`,
            workload: `${workloadDelay} day(s) queue delay (1 day per test, ${queueCount} tests in queue)`,
            seasonal: seasonalDelay > 0 
                ? `${seasonalDelay} day(s) seasonal wait (Season: ${season})` 
                : `0 days (Season ${season} is currently active or Any)`,
            weather: `${weatherBuffer} day(s) weather buffer (${rainyDaysCount} rainy day(s) forecast)`
        }
    };
};

/**
 * Fetches live data and estimates for a single machine.
 */
export const getMachineEstimation = async (machineId) => {
    const [machines] = await db.query(
        `SELECT m.*, 
                (SELECT COUNT(*) FROM Reports r WHERE r.machine_id = m.machine_id AND r.ce_status = 'Approved') AS has_approved_report
         FROM Machinery m 
         WHERE m.machine_id = ?`,
        [machineId]
    );

    if (machines.length === 0) {
        throw new Error(`Machine with ID ${machineId} not found.`);
    }

    const machine = machines[0];

    const [tests] = await db.query(
        `SELECT test_id, test_name, is_field_test, required_season, status, catalog_key FROM Test_Records WHERE machine_id = ?`,
        [machineId]
    );

    const hasFieldTest = tests.length === 0 || tests.some(t => Boolean(t.is_field_test));
    const catalogKey = tests.find(t => t.catalog_key)?.catalog_key || null;
    const requiredSeason = tests.find(t => t.required_season && t.required_season !== 'Any')?.required_season 
        || getRequiredSeasonForMachine(machine.machine_name, catalogKey);

    const [[{ pending_count }]] = await db.query(
        `SELECT COUNT(*) AS pending_count FROM Test_Records WHERE status IN ('Draft', 'Submitted', 'Reviewed')`
    );

    let rainyDaysCount = 0;
    try {
        const rainyDates = await getRainyDates();
        rainyDaysCount = Array.isArray(rainyDates) ? rainyDates.length : (rainyDates?.size || 0);
    } catch (e) {
        console.warn("Weather forecast unavailable:", e.message);
    }

    const allSeasons = await getFarmSeasons();
    const baseDate = machine.registration_date || machine.created_at || new Date();

    const estimation = computeEstimation({
        machineId: machine.machine_id,
        machineName: machine.machine_name,
        catalogKey,
        requiredSeason,
        isFieldTest: hasFieldTest,
        baseDate,
        queueCount: pending_count,
        rainyDaysCount,
        allSeasons
    });

    estimation.hasApprovedReport = Boolean(machine.has_approved_report);
    estimation.isOnHold = Boolean(machine.is_on_hold);
    estimation.holdReason = machine.hold_reason || null;
    estimation.model = machine.model || null;
    estimation.supplier = machine.supplier || null;

    return estimation;
};

/**
 * Generates active report completion estimations for dashboard display.
 */
export const getDashboardEstimations = async (limit = 8) => {
    const [[{ pending_count }]] = await db.query(
        `SELECT COUNT(*) AS pending_count FROM Test_Records WHERE status IN ('Draft', 'Submitted', 'Reviewed')`
    );

    let rainyDaysCount = 0;
    try {
        const rainyDates = await getRainyDates();
        rainyDaysCount = Array.isArray(rainyDates) ? rainyDates.length : (rainyDates?.size || 0);
    } catch (e) {
        console.warn("Weather forecast fetch error:", e.message);
    }

    const allSeasons = await getFarmSeasons();

    const [machines] = await db.query(`
        SELECT m.machine_id, m.machine_name, m.model, m.supplier, m.registration_date, m.is_on_hold, m.hold_reason,
               COUNT(tr.test_id) AS total_tests,
               SUM(CASE WHEN tr.status = 'Approved' THEN 1 ELSE 0 END) AS approved_tests,
               (SELECT COUNT(*) FROM Reports r WHERE r.machine_id = m.machine_id AND r.ce_status = 'Approved') AS has_approved_report,
               (SELECT tr.required_season FROM Test_Records tr WHERE tr.machine_id = m.machine_id AND tr.required_season != 'Any' LIMIT 1) AS machine_season,
               (SELECT tr.catalog_key FROM Test_Records tr WHERE tr.machine_id = m.machine_id AND tr.catalog_key IS NOT NULL LIMIT 1) AS catalog_key
        FROM Machinery m
        LEFT JOIN Test_Records tr ON tr.machine_id = m.machine_id
        GROUP BY m.machine_id
        HAVING has_approved_report = 0
        ORDER BY m.registration_date DESC, m.created_at DESC
        LIMIT ?
    `, [Number(limit) || 8]);

    return machines.map(machine => {
        const season = machine.machine_season || getRequiredSeasonForMachine(machine.machine_name, machine.catalog_key);
        const estimation = computeEstimation({
            machineId: machine.machine_id,
            machineName: machine.machine_name,
            catalogKey: machine.catalog_key,
            requiredSeason: season,
            isFieldTest: true,
            baseDate: machine.registration_date || new Date(),
            queueCount: pending_count,
            rainyDaysCount,
            allSeasons
        });

        return {
            ...estimation,
            model: machine.model,
            supplier: machine.supplier,
            totalTests: machine.total_tests,
            approvedTests: machine.approved_tests,
            isOnHold: Boolean(machine.is_on_hold),
            holdReason: machine.hold_reason
        };
    });
};
