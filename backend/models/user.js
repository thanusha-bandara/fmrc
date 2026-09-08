import db from '../config/db.js';

export const getTechnicalAssistants = async () => {
    const [tas] = await db.query(`SELECT user_id, full_name FROM Users WHERE role = 'Technical_Assistant' AND is_active = TRUE`);
    return tas;
};

export const getTALeaves = async () => {
    const [leaves] = await db.query(`
        SELECT user_id, DATE_FORMAT(date, '%Y-%m-%d') as leave_date
        FROM Staff_Availability
        WHERE is_on_leave = TRUE
    `);
    return leaves;
};

const PUBLIC_FIELDS = "user_id, full_name, username, email, phone, role, is_active, created_at";

export const findUserByUsernameOrEmail = async (identifier) => {
    const [rows] = await db.query(
        `SELECT * FROM Users WHERE username = ? OR email = ? LIMIT 1`,
        [identifier, identifier]
    );
    return rows[0] || null;
};

export const findUserById = async (userId) => {
    const [rows] = await db.query(`SELECT ${PUBLIC_FIELDS} FROM Users WHERE user_id = ?`, [userId]);
    return rows[0] || null;
};

export const createUser = async ({ full_name, username, email, password_hash, phone, role }) => {
    const [result] = await db.query(
        `INSERT INTO Users (full_name, username, email, password_hash, phone, role, is_active)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [full_name, username, email, password_hash, phone || null, role]
    );
    return findUserById(result.insertId);
};

export const getAllUsers = async () => {
    const [rows] = await db.query(`SELECT ${PUBLIC_FIELDS} FROM Users ORDER BY created_at DESC`);
    return rows;
};

export const updateUser = async (userId, { full_name, email, phone, role, is_active }) => {
    await db.query(
        `UPDATE Users SET
            full_name = COALESCE(?, full_name),
            email = COALESCE(?, email),
            phone = COALESCE(?, phone),
            role = COALESCE(?, role),
            is_active = COALESCE(?, is_active)
         WHERE user_id = ?`,
        [full_name ?? null, email ?? null, phone ?? null, role ?? null, is_active ?? null, userId]
    );
    return findUserById(userId);
};

export const updateUserPassword = async (userId, password_hash) => {
    await db.query(`UPDATE Users SET password_hash = ? WHERE user_id = ?`, [password_hash, userId]);
};

export const deleteUser = async (userId) => {
    const [result] = await db.query(`DELETE FROM Users WHERE user_id = ?`, [userId]);
    return result.affectedRows > 0;
};

export const getUsersByRole = async (role) => {
    const [rows] = await db.query(`SELECT ${PUBLIC_FIELDS} FROM Users WHERE role = ? AND is_active = TRUE`, [role]);
    return rows;
};