import db from '../config/db.js';

// field.js now handles farm daily status and farm seasons

export const getCurrentSeason = async () => {
    const [rows] = await db.query(
        `SELECT season_type FROM farm_seasons 
         WHERE CURDATE() BETWEEN start_date AND end_date 
         ORDER BY start_date DESC LIMIT 1`
    );
    return rows.length > 0 ? rows[0].season_type : 'Any';
};

// --- Global Farm Daily Status ---
export const listFarmDailyStatus = async ({ from, to }) => {
    let q = `SELECT date, is_field_available, is_water_available FROM farm_daily_status`;
    let params = [];
    if (from || to) {
        q += ' WHERE 1=1';
        if (from) { q += ' AND date >= ?'; params.push(from); }
        if (to) { q += ' AND date <= ?'; params.push(to); }
    }
    const [rows] = await db.query(q, params);
    return rows;
};

export const setFarmDailyStatus = async (date, isFieldAvailable, isWaterAvailable) => {
    const [result] = await db.query(
        `INSERT INTO farm_daily_status (date, is_field_available, is_water_available)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         is_field_available = VALUES(is_field_available), is_water_available = VALUES(is_water_available)`,
        [date, isFieldAvailable, isWaterAvailable]
    );
    return result;
};

// --- Farm Seasons ---
export const getFarmSeasons = async () => {
    const [rows] = await db.query(`SELECT id, season_type, start_date, end_date FROM farm_seasons ORDER BY start_date DESC`);
    return rows;
};

export const setFarmSeason = async (seasonType, startDate, endDate) => {
    const [result] = await db.query(
        `INSERT INTO farm_seasons (season_type, start_date, end_date) VALUES (?, ?, ?)`,
        [seasonType, startDate, endDate]
    );
    return result.insertId;
};

export const deleteFarmSeason = async (id) => {
    const [result] = await db.query(`DELETE FROM farm_seasons WHERE id = ?`, [id]);
    return result.affectedRows > 0;
};

