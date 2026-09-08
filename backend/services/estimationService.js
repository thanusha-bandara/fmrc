import { countActiveTestsForMachineType } from "../models/testRecord.js";
import { getRainyDates } from "./weatherService.js";

// Fixed institutional benchmarks (Ds) in days, per SRS section 1.2.1.
// Falls back to DEFAULT_DURATION for any test name not listed here.
const STANDARD_DURATIONS = {
    "4-Wheel Tractor Test": 11,
    "Power Tiller Test": 7,
    "Combine Harvester Test": 14,
    "Water Pump Test": 4,
    "Brake Test": 2,
    "Sprayer Test": 3
};

const DEFAULT_DURATION = 10;

// One extra day of workload delay for every 3 tests already queued for the same test type,
// capped so a large backlog doesn't produce an unreasonable estimate.
const TESTS_PER_WORKLOAD_DAY = 3;
const MAX_WORKLOAD_DELAY = 10;

// One day safety buffer added whenever rain is forecast within the lookahead window.
const WEATHER_BUFFER_DAYS = 1;
const WEATHER_LOOKAHEAD_DAYS = 5;

const getStandardDuration = (testName) => STANDARD_DURATIONS[testName] ?? DEFAULT_DURATION;

const calculateWorkloadDelay = (pendingCount) => {
    const delay = Math.floor(pendingCount / TESTS_PER_WORKLOAD_DAY);
    return Math.min(delay, MAX_WORKLOAD_DELAY);
};

const isRainForecastSoon = (rainyDates) => {
    const today = new Date();
    for (let i = 0; i <= WEATHER_LOOKAHEAD_DAYS; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];
        if (rainyDates.includes(dateStr)) return true;
    }
    return false;
};

// Returns the estimated report completion date for a given test type, following the
// Rule-Based Predictive Estimation Module described in the SRS (Ds + Lw + Bw).
export const estimateCompletion = async (testName, isFieldTest = true) => {
    const standardDuration = getStandardDuration(testName);
    const pendingCount = await countActiveTestsForMachineType(testName);
    const workloadDelay = calculateWorkloadDelay(pendingCount);

    let weatherBuffer = 0;
    if (isFieldTest) {
        const rainyDates = await getRainyDates();
        weatherBuffer = isRainForecastSoon(rainyDates) ? WEATHER_BUFFER_DAYS : 0;
    }

    const totalDays = standardDuration + workloadDelay + weatherBuffer;

    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + totalDays);

    return {
        testName,
        standardDurationDays: standardDuration,
        workloadDelayDays: workloadDelay,
        weatherBufferDays: weatherBuffer,
        totalEstimatedDays: totalDays,
        pendingTestsInQueue: pendingCount,
        estimatedCompletionDate: estimatedDate.toISOString().split("T")[0]
    };
};
