import db from '../config/db.js';

export const upsertWeatherLog = async (date, isRainy, markedBy) => {
    if (markedBy === 'Manual') {
        await db.query(
            `INSERT INTO Weather_Logs (log_date, is_rainy, marked_by)
             VALUES (?, ?, 'Manual')
             ON DUPLICATE KEY UPDATE is_rainy = VALUES(is_rainy), marked_by = 'Manual'`,
            [date, isRainy]
        );
    } else {
        // API logs shouldn't overwrite Manual logs
        await db.query(
            `INSERT INTO Weather_Logs (log_date, is_rainy, marked_by)
             VALUES (?, ?, 'API')
             ON DUPLICATE KEY UPDATE
             is_rainy = IF(marked_by = 'Manual', is_rainy, VALUES(is_rainy)),
             marked_by = IF(marked_by = 'Manual', 'Manual', 'API')`,
            [date, isRainy]
        );
    }
};

export const getRainyDatesFromDB = async () => {
    const [rows] = await db.query(`
        SELECT DATE_FORMAT(log_date, '%Y-%m-%d') as date
        FROM Weather_Logs
        WHERE is_rainy = TRUE
    `);
    return rows.map(r => r.date);
};
