import db from '../config/db.js';

export const getAllLabours = async () => {
    const [rows] = await db.query(`SELECT * FROM labours ORDER BY name ASC`);
    return rows;
};

export const createLabour = async (name) => {
    const [result] = await db.query(`INSERT INTO labours (name) VALUES (?)`, [name]);
    return { labour_id: result.insertId, name, is_active: 1 };
};

export const updateLabour = async (id, name, isActive) => {
    await db.query(`UPDATE labours SET name = ?, is_active = ? WHERE labour_id = ?`, [name, isActive, id]);
};

export const deleteLabour = async (id) => {
    await db.query(`DELETE FROM labours WHERE labour_id = ?`, [id]);
};

// Labour Availability
export const setLabourAvailability = async (labourId, date, isOnLeave, reason) => {
    await db.query(
        `INSERT INTO labour_availability (labour_id, date, is_on_leave, reason)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE is_on_leave = VALUES(is_on_leave), reason = VALUES(reason)`,
        [labourId, date, isOnLeave, reason || null]
    );

    const [rows] = await db.query(
        `SELECT * FROM labour_availability WHERE labour_id = ? AND date = ?`,
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
        SELECT la.*, l.name as full_name
        FROM labour_availability la
        JOIN labours l ON la.labour_id = l.labour_id
        ${where}
        ORDER BY la.date DESC
    `, params);
    return rows;
};
