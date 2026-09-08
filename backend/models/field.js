import db from '../config/db.js';

export const getAvailableFields = async () => {
    const [fields] = await db.query(`SELECT field_id, field_name, water_available, is_land_preparation_period FROM Field_Status WHERE is_available = TRUE`);
    return fields;
};

export const getCurrentSeason = async () => {
    const [rows] = await db.query(`SELECT season FROM Field_Status WHERE is_available = TRUE LIMIT 1`);
    // Fallback to 'Any' if no specific season is set in the fields
    return rows.length > 0 ? rows[0].season : 'Any';
};

export const getAllFields = async () => {
    const [rows] = await db.query(`SELECT * FROM Field_Status ORDER BY field_name ASC`);
    return rows;
};

export const getFieldById = async (fieldId) => {
    const [rows] = await db.query(`SELECT * FROM Field_Status WHERE field_id = ?`, [fieldId]);
    return rows[0] || null;
};

export const createField = async ({ field_name, is_available, water_available, season, is_land_preparation_period }) => {
    const [result] = await db.query(
        `INSERT INTO Field_Status (field_name, is_available, water_available, season, is_land_preparation_period)
         VALUES (?, ?, ?, ?, ?)`,
        [field_name, is_available ?? true, water_available ?? false, season || 'Off-Season', is_land_preparation_period ?? false]
    );
    return getFieldById(result.insertId);
};

// Used by Technical Assistants to keep field/water availability current for the scheduler.
export const updateField = async (fieldId, { field_name, is_available, water_available, season, is_land_preparation_period }) => {
    await db.query(
        `UPDATE Field_Status SET
            field_name = COALESCE(?, field_name),
            is_available = COALESCE(?, is_available),
            water_available = COALESCE(?, water_available),
            season = COALESCE(?, season),
            is_land_preparation_period = COALESCE(?, is_land_preparation_period)
         WHERE field_id = ?`,
        [
            field_name ?? null,
            is_available ?? null,
            water_available ?? null,
            season ?? null,
            is_land_preparation_period ?? null,
            fieldId
        ]
    );
    return getFieldById(fieldId);
};

export const deleteField = async (fieldId) => {
    const [result] = await db.query(`DELETE FROM Field_Status WHERE field_id = ?`, [fieldId]);
    return result.affectedRows > 0;
};
