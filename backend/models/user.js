import db from '../config/db.js';

export const getTechnicalAssistants = async () => {
    const [tas] = await db.query(`SELECT user_id, full_name FROM Users WHERE role IN ('Technical_Assistant', 'Agriculture_Instructor') AND is_active = TRUE`);
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

export const hasPendingResetRequest = async (userId) => {
    const [rows] = await db.query(
        `SELECT request_id FROM Password_Reset_Requests WHERE user_id = ? AND status = 'Pending' LIMIT 1`,
        [userId]
    );
    return rows.length > 0;
};

export const createResetRequest = async (userId, username) => {
    await db.query(`INSERT INTO Password_Reset_Requests (user_id, username) VALUES (?, ?)`, [userId, username]);
};

export const listPendingResetRequests = async () => {
    const [rows] = await db.query(
        `SELECT r.request_id, r.user_id, r.requested_at, u.full_name, u.username, u.role
         FROM Password_Reset_Requests r
         JOIN Users u ON u.user_id = r.user_id
         WHERE r.status = 'Pending'
         ORDER BY r.requested_at ASC`
    );
    return rows;
};

export const completeResetRequests = async (userId) => {
    await db.query(
        `UPDATE Password_Reset_Requests SET status = 'Completed', completed_at = NOW()
         WHERE user_id = ? AND status = 'Pending'`,
        [userId]
    );
};

export const deleteUser = async (userId) => {
    const [result] = await db.query(`DELETE FROM Users WHERE user_id = ?`, [userId]);
    return result.affectedRows > 0;
};

export const getUsersByRole = async (role) => {
    if (role === 'Technical_Assistant') {
        const [rows] = await db.query(`SELECT ${PUBLIC_FIELDS} FROM Users WHERE role IN ('Technical_Assistant', 'Agriculture_Instructor') AND is_active = TRUE`);
        return rows;
    }
    const [rows] = await db.query(`SELECT ${PUBLIC_FIELDS} FROM Users WHERE role = ? AND is_active = TRUE`, [role]);
    return rows;
};