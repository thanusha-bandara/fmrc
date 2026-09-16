import db from '../config/db.js';

// Admin / Technical Assistant marks a labourer as on-leave / available for a given date.
// Upserts on (labour_id, date) so re-submitting the same day just updates the entry.
export const setLabourAvailability = async (labourId, date, isOnLeave, reason) => {
    await db.query(
        `INSERT INTO Labour_Availability (labour_id, date, is_on_leave, reason)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE is_on_leave = VALUES(is_on_leave), reason = VALUES(reason)`,
        [labourId, date, isOnLeave, reason || null]
    );

    const [rows] = await db.query(
        `SELECT availability_id, labour_id, DATE_FORMAT(date, '%Y-%m-%d') as date, is_on_leave, reason
         FROM Labour_Availability WHERE labour_id = ? AND date = ?`,
        [labourId, date]
    );
    return rows[0] || null;
};

export const listLabourAvailability = async ({ labourId, from, to } = {}) => {
    const conditions = [];
    const params = [];

    if (labourId) {
        conditions.push("la.labour_id = ?");
        params.push(labourId);
    }
    if (from) {
        conditions.push("la.date >= ?");
        params.push(from);
    }
    if (to) {
        conditions.push("la.date <= ?");
        params.push(to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await db.query(`
        SELECT la.availability_id, la.labour_id, DATE_FORMAT(la.date, '%Y-%m-%d') as date,
               la.is_on_leave, la.reason, l.full_name
        FROM Labour_Availability la
        JOIN Labours l ON la.labour_id = l.labour_id
        ${where}
        ORDER BY la.date DESC
    `, params);
    return rows;
};

export const deleteLabourAvailability = async (availabilityId) => {
    const [result] = await db.query(`DELETE FROM Labour_Availability WHERE availability_id = ?`, [availabilityId]);
    return result.affectedRows > 0;
};
