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
>>>>>>> 6fbbe5374139ecab1b933ca3bdcf9f0787ff6be5
};
