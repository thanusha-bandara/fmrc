import db from '../config/db.js';

export const getLabours = async () => {
    const [rows] = await db.query(`SELECT labour_id, full_name FROM Labours WHERE is_active = TRUE`);
    return rows;
};

export const getAllLabours = async () => {
    const [rows] = await db.query(`SELECT labour_id, full_name, phone, is_active, created_at FROM Labours ORDER BY created_at DESC`);
    return rows;
};

export const findLabourById = async (labourId) => {
    const [rows] = await db.query(`SELECT labour_id, full_name, phone, is_active, created_at FROM Labours WHERE labour_id = ?`, [labourId]);
    return rows[0] || null;
};

export const createLabour = async ({ full_name, phone }) => {
    const [result] = await db.query(
        `INSERT INTO Labours (full_name, phone, is_active) VALUES (?, ?, TRUE)`,
        [full_name, phone || null]
    );
    return findLabourById(result.insertId);
};

export const updateLabour = async (labourId, { full_name, phone, is_active }) => {
    await db.query(
        `UPDATE Labours SET
            full_name = COALESCE(?, full_name),
            phone = COALESCE(?, phone),
            is_active = COALESCE(?, is_active)
         WHERE labour_id = ?`,
        [full_name ?? null, phone ?? null, is_active ?? null, labourId]
    );
    return findLabourById(labourId);
};

export const deleteLabour = async (labourId) => {
    const [result] = await db.query(`DELETE FROM Labours WHERE labour_id = ?`, [labourId]);
    return result.affectedRows > 0;
};

export const getLabourLeaves = async () => {
    const [leaves] = await db.query(`
        SELECT labour_id, DATE_FORMAT(date, '%Y-%m-%d') as leave_date
        FROM Labour_Availability
        WHERE is_on_leave = TRUE
    `);
    return leaves;
};

// Used by the scheduler to know the total headcount pool available on a given day
// (total active labourers minus those on leave that day) — no identity tracking needed.
export const getActiveLabourCount = async () => {
    const [rows] = await db.query(`SELECT COUNT(*) AS count FROM Labours WHERE is_active = TRUE`);
    return rows[0].count;
};
