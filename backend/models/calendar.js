import db from '../config/db.js';

export const getCustomHolidays = async () => {
    const [rows] = await db.query(`SELECT DATE_FORMAT(date, '%Y-%m-%d') as dateStr, reason FROM FMRC_Calendar WHERE is_holiday = TRUE`);
    return rows.map(r => r.dateStr);
};

// holiday_type is only set on first insert -- re-marking a date that already
// exists (e.g. a seeded Government poya day) must never flip it to FMRC, or
// the calendar loses track of which days are real government holidays.
export const addCustomHoliday = async (date, reason, holidayType = "FMRC") => {
    await db.query(
        `INSERT INTO FMRC_Calendar (date, reason, is_holiday, holiday_type)
         VALUES (?, ?, TRUE, ?)
         ON DUPLICATE KEY UPDATE reason = VALUES(reason), is_holiday = TRUE`,
        [date, reason, holidayType]
    );
};

// Turns a day back into a working day for FMRC without deleting the record,
// so a Government holiday stays known (and shown) even once FMRC opts not to
// treat it as a day off.
export const setHolidayInactive = async (calendarId) => {
    const [result] = await db.query(
        `UPDATE FMRC_Calendar SET is_holiday = FALSE WHERE calendar_id = ?`,
        [calendarId]
    );
    return result.affectedRows > 0;
};
