import { addCustomHoliday } from '../models/calendar.js';
import { handleRescheduleForHoliday } from '../services/rescheduleService.js';
import { runAutomaticScheduling } from '../services/autoScheduleService.js';
import db from '../config/db.js';

export const listHolidays = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT calendar_id, DATE_FORMAT(date, '%Y-%m-%d') as date, reason, is_holiday
             FROM FMRC_Calendar ORDER BY date ASC`
        );
        res.status(200).json({ success: true, holidays: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching calendar.", error: error.message });
    }
};

export const removeHoliday = async (req, res) => {
    try {
        const [result] = await db.query(`DELETE FROM FMRC_Calendar WHERE calendar_id = ?`, [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Holiday not found." });
        }
        runAutomaticScheduling();
        res.status(200).json({ success: true, message: "Holiday removed. Rescheduling triggered." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error removing holiday.", error: error.message });
    }
};

export const markHoliday = async (req, res) => {
    try {
        const { date, reason } = req.body;

        if (!date) {
            return res.status(400).json({ success: false, message: "Holiday date is required" });
        }

        // 1. Add holiday to the calendar
        await addCustomHoliday(date, reason || "Special Non-Working Day");

        // 2. Mark existing tests as rescheduled
        const affectedTestsCount = await handleRescheduleForHoliday(date);

        // 3. Automatically trigger the full GA rescheduling
        runAutomaticScheduling();

        res.status(200).json({
            success: true,
            message: `Date ${date} marked as holiday. Triggered automatic rescheduling for ${affectedTestsCount} test(s).`
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error setting holiday",
            error: error.message
        });
    }
};
