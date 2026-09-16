import { addCustomHoliday, setHolidayInactive } from '../models/calendar.js';
import { handleRescheduleForHoliday } from '../services/rescheduleService.js';
import { runAutomaticScheduling } from '../services/autoScheduleService.js';
import { logResourceAudit } from '../models/auditLog.js';
import db from '../config/db.js';

export const listHolidays = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT calendar_id, DATE_FORMAT(date, '%Y-%m-%d') as date, reason, is_holiday, holiday_type
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
        logResourceAudit(req, "remove_holiday", { calendarId: req.params.id });
        res.status(200).json({ success: true, message: "Holiday removed. Rescheduling triggered." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error removing holiday.", error: error.message });
    }
};

// Used for a day that already has a calendar record (typically a seeded
// Government holiday) when FMRC decides it isn't a day off after all. Unlike
// removeHoliday this keeps the row -- and its holiday_type -- so the day is
// still shown as a real Government holiday, just not one FMRC is closed for.
export const unmarkHoliday = async (req, res) => {
    try {
        const updated = await setHolidayInactive(req.params.id);
        if (!updated) {
            return res.status(404).json({ success: false, message: "Holiday not found." });
        }
        runAutomaticScheduling();
        logResourceAudit(req, "unmark_holiday", { calendarId: req.params.id });
        res.status(200).json({ success: true, message: "Marked as a working day. Rescheduling triggered." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating calendar.", error: error.message });
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

        logResourceAudit(req, "mark_holiday", { date, reason });

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
