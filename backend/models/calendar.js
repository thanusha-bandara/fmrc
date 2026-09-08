import db from '../config/db.js';

export const getCustomHolidays = async () => {
    const [rows] = await db.query(`SELECT DATE_FORMAT(date, '%Y-%m-%d') as dateStr, reason FROM FMRC_Calendar WHERE is_holiday = TRUE`);
    return rows.map(r => r.dateStr);
};

export const addCustomHoliday = async (date, reason) => {
    await db.query(
        `INSERT INTO FMRC_Calendar (date, reason, is_holiday)
         VALUES (?, ?, TRUE)
         ON DUPLICATE KEY UPDATE reason = VALUES(reason), is_holiday = TRUE`,
        [date, reason]
    );
};
