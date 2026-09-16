import { listFarmDailyStatus, setFarmDailyStatus, getFarmSeasons, setFarmSeason, deleteFarmSeason } from "../models/field.js";
import { setStaffAvailability, listStaffAvailability, deleteStaffAvailability } from "../models/staffAvailability.js";
import { runAutomaticScheduling } from "../services/autoScheduleService.js";

// ---- Farm Global Availability & Seasons ----

export const listFarmDailyStatusController = async (req, res) => {
    try {
        const { from, to } = req.query;
        const records = await listFarmDailyStatus({ from, to });
        res.status(200).json({ success: true, records });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching farm daily status.", error: error.message });
    }
};

export const setFarmDailyStatusController = async (req, res) => {
    try {
        const { date, isFieldAvailable, isWaterAvailable } = req.body;
        if (!date) {
            return res.status(400).json({ success: false, message: "date is required." });
        }
        const record = await setFarmDailyStatus(date, isFieldAvailable ?? true, isWaterAvailable ?? false);
        runAutomaticScheduling();
        res.status(200).json({ success: true, message: "Farm daily status updated.", record });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error setting farm daily status.", error: error.message });
    }
};

export const listFarmSeasonsController = async (req, res) => {
    try {
        const records = await getFarmSeasons();
        res.status(200).json({ success: true, records });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching farm seasons.", error: error.message });
    }
};

export const setFarmSeasonController = async (req, res) => {
    try {
        const { seasonType, startDate, endDate } = req.body;
        if (!seasonType || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }
        const recordId = await setFarmSeason(seasonType, startDate, endDate);
        runAutomaticScheduling();
        res.status(200).json({ success: true, message: "Farm season added.", id: recordId });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error setting farm season.", error: error.message });
    }
};

export const deleteFarmSeasonController = async (req, res) => {
    try {
        const deleted = await deleteFarmSeason(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Season not found." });
        }
        runAutomaticScheduling();
        res.status(200).json({ success: true, message: "Season removed." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error removing season.", error: error.message });
    }
};

// ---- Human resource availability ----

export const listAvailability = async (req, res) => {
    try {
        const { userId, from, to } = req.query;
        const records = await listStaffAvailability({ userId, from, to });
        res.status(200).json({ success: true, records });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching staff availability.", error: error.message });
    }
};

// Technical Assistant: mark a staff member on leave / back available for a date.
// Leave changes affect who the GA scheduler can assign, so trigger a reschedule.
export const setAvailability = async (req, res) => {
    try {
        const { userId, date, isOnLeave, reason } = req.body;
        if (!userId || !date || isOnLeave === undefined) {
            return res.status(400).json({ success: false, message: "userId, date and isOnLeave are required." });
        }
        const record = await setStaffAvailability(userId, date, isOnLeave, reason);
        runAutomaticScheduling();
        res.status(200).json({ success: true, message: "Availability updated. Rescheduling triggered.", record });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error setting availability.", error: error.message });
    }
};

export const removeAvailability = async (req, res) => {
    try {
        const deleted = await deleteStaffAvailability(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Availability record not found." });
        }
        res.status(200).json({ success: true, message: "Availability record removed." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error removing availability record.", error: error.message });
    }
};
