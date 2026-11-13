import {
    getDashboardEstimations,
    getMachineEstimation,
    computeEstimation
} from "../services/predictiveEstimationService.js";
import { getFarmSeasons } from "../models/field.js";

// GET /api/estimation
export const getActiveEstimations = async (req, res) => {
    try {
        const limit = req.query.limit || 8;
        const estimations = await getDashboardEstimations(limit);
        res.status(200).json({ success: true, estimations });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error generating estimations.", error: error.message });
    }
};

// GET /api/estimation/machine/:id
export const getSingleMachineEstimation = async (req, res) => {
    try {
        const estimation = await getMachineEstimation(req.params.id);
        res.status(200).json({ success: true, estimation });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching machine estimation.", error: error.message });
    }
};

// POST /api/estimation/calculate
export const calculateCustomEstimation = async (req, res) => {
    try {
        const {
            machineName = "4-Wheel Tractor",
            catalogKey = null,
            requiredSeason = null,
            isFieldTest = true,
            baseDate = new Date(),
            queueCount = 0,
            rainyDaysCount = 0,
            workloadDelayOverride = null,
            weatherBufferOverride = null,
            seasonalDelayOverride = null
        } = req.body || {};

        const allSeasons = await getFarmSeasons();

        const result = computeEstimation({
            machineName,
            catalogKey,
            requiredSeason,
            isFieldTest,
            baseDate,
            queueCount,
            rainyDaysCount,
            allSeasons,
            workloadDelayOverride,
            weatherBufferOverride,
            seasonalDelayOverride
        });

        res.status(200).json({ success: true, estimation: result });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error calculating estimation.", error: error.message });
    }
};
