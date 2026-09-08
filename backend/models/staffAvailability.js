import db from '../config/db.js';

// Technical Assistant marks a staff member as on-leave / available for a given date.
// Upserts on (user_id, date) so re-submitting the same day just updates the entry.
export const setStaffAvailability = async (userId, date, isOnLeave, reason) => {
    await db.query(
        `INSERT INTO Staff_Availability (user_id, date, is_on_leave, reason)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE is_on_leave = VALUES(is_on_leave), reason = VALUES(reason)`,
        [userId, date, isOnLeave, reason || null]
    );

    const [rows] = await db.query(
        `SELECT * FROM Staff_Availability WHERE user_id = ? AND date = ?`,
        [userId, date]
    );
    return rows[0] || null;
};

export const listStaffAvailability = async ({ userId, from, to } = {}) => {
    const conditions = [];
    const params = [];

    if (userId) {
        conditions.push("sa.user_id = ?");
        params.push(userId);
    }
    if (from) {
        conditions.push("sa.date >= ?");
        params.push(from);
    }
    if (to) {
        conditions.push("sa.date <= ?");
        params.push(to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await db.query(`
        SELECT sa.*, u.full_name, u.role
        FROM Staff_Availability sa
        JOIN Users u ON sa.user_id = u.user_id
        ${where}
        ORDER BY sa.date DESC
    `, params);
    return rows;
};

export const deleteStaffAvailability = async (availabilityId) => {
    const [result] = await db.query(`DELETE FROM Staff_Availability WHERE availability_id = ?`, [availabilityId]);
    return result.affectedRows > 0;
};
