import { upsertWeatherLog } from '../models/weatherLog.js';
import { runAutomaticScheduling } from '../services/autoScheduleService.js';
import { getRainyDates } from '../services/weatherService.js';
import db from '../config/db.js';

export const listWeatherLogs = async (req, res) => {
    try {
        const [logs] = await db.query(
            `SELECT log_id, DATE_FORMAT(log_date, '%Y-%m-%d') as date, is_rainy, marked_by, updated_at
             FROM Weather_Logs ORDER BY log_date ASC`
        );
        res.status(200).json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching weather logs.", error: error.message });
    }
};

// Refreshes the OpenWeatherMap forecast into the database and returns the merged rainy-date list.
export const refreshWeather = async (req, res) => {
    try {
        const rainyDates = await getRainyDates();
        res.status(200).json({ success: true, rainyDates });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error refreshing weather data.", error: error.message });
    }
};

export const setManualWeather = async (req, res) => {
    try {
        const { date, isRainy } = req.body;

        if (!date || isRainy === undefined) {
            return res.status(400).json({ success: false, message: "Date and isRainy status are required" });
        }

        // Insert or update the manual weather log
        await upsertWeatherLog(date, isRainy, 'Manual');

        // Trigger automatic rescheduling to optimize based on the new weather
        runAutomaticScheduling();

        res.status(200).json({
            success: true,
            message: `Weather for ${date} successfully marked as ${isRainy ? 'Rainy' : 'Not Rainy'}. Rescheduling triggered.`
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error saving manual weather log",
            error: error.message
        });
    }
};
