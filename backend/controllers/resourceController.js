import { getAllFields, getFieldById, createField, updateField, deleteField } from "../models/field.js";
import { setStaffAvailability, listStaffAvailability, deleteStaffAvailability } from "../models/staffAvailability.js";
import {
    setLabourAvailability as setLabourAvailabilityRecord,
    listLabourAvailability as listLabourAvailabilityRecords,
    deleteLabourAvailability
} from "../models/labourAvailability.js";
import { runAutomaticScheduling } from "../services/autoScheduleService.js";

// ---- Field availability ----

export const listFields = async (req, res) => {
    try {
        const fields = await getAllFields();
        res.status(200).json({ success: true, fields });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching fields.", error: error.message });
    }
};

export const addField = async (req, res) => {
    try {
        const { field_name } = req.body;
        if (!field_name) {
            return res.status(400).json({ success: false, message: "field_name is required." });
        }
        const field = await createField(req.body);
        res.status(201).json({ success: true, message: "Field added.", field });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error adding field.", error: error.message });
    }
};

// Technical Assistant: update field/water availability, season, or land-prep status.
// Any change here can shift what the scheduler considers feasible, so we re-run it.
export const editField = async (req, res) => {
    try {
        const existing = await getFieldById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Field not found." });
        }
        const field = await updateField(req.params.id, req.body);
        runAutomaticScheduling();
        res.status(200).json({ success: true, message: "Field updated. Rescheduling triggered.", field });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating field.", error: error.message });
    }
};

export const removeField = async (req, res) => {
    try {
        const deleted = await deleteField(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Field not found." });
        }
        res.status(200).json({ success: true, message: "Field removed." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error removing field.", error: error.message });
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

// ---- Labour availability ----

export const listLabourAvailability = async (req, res) => {
    try {
        const { labourId, from, to } = req.query;
        const records = await listLabourAvailabilityRecords({ labourId, from, to });
        res.status(200).json({ success: true, records });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching labour availability.", error: error.message });
    }
};

// Admin / Technical Assistant: mark a labourer on leave / back available for a date.
// Labour headcount feeds the scheduler's day-feasibility check, so trigger a reschedule.
export const setLabourAvailability = async (req, res) => {
    try {
        const { labourId, date, isOnLeave, reason } = req.body;
        if (!labourId || !date || isOnLeave === undefined) {
            return res.status(400).json({ success: false, message: "labourId, date and isOnLeave are required." });
        }
        const record = await setLabourAvailabilityRecord(labourId, date, isOnLeave, reason);
        runAutomaticScheduling();
        res.status(200).json({ success: true, message: "Availability updated. Rescheduling triggered.", record });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error setting labour availability.", error: error.message });
    }
};

export const removeLabourAvailability = async (req, res) => {
    try {
        const deleted = await deleteLabourAvailability(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Availability record not found." });
        }
        res.status(200).json({ success: true, message: "Availability record removed." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error removing availability record.", error: error.message });
    }
};
