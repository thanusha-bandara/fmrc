import dotenv from 'dotenv';
import { upsertWeatherLog } from '../models/weatherLog.js';

dotenv.config();

export const getRainyDates = async () => {
    try {
        const apiKey = process.env.OPENWEATHER_API_KEY;
    
        const lat = process.env.WEATHER_LAT || 8.1132; 
        const lon = process.env.WEATHER_LON || 80.4636;
        
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.cod === "200") {
            const rainyDates = new Set(); 
            const allDates = new Set();

            data.list.forEach(item => {
                const dateString = item.dt_txt.split(' ')[0]; 
                allDates.add(dateString);

                const isRaining = item.weather.some(w => w.id >= 200 && w.id < 600);
                if (isRaining) {
                    rainyDates.add(dateString);
                }
            });

            // Save to database
            try {
                for (const date of Array.from(allDates)) {
                    const isRainy = rainyDates.has(date);
                    await upsertWeatherLog(date, isRainy, 'API');
                }
            } catch (dbError) {
                console.error("Error saving weather to DB:", dbError.message);
            }
        } else {
            console.error("Weather API Error or missing key. Skipping live sync.");
        }

        // ALWAYS return the final merged list from the database! (Manual + API)
        const { getRainyDatesFromDB } = await import('../models/weatherLog.js');
        const finalRainyDates = await getRainyDatesFromDB();
        
        return finalRainyDates; 

    } catch (error) {
        console.log("Weather API offline or fetch failed. Using local database fallback.");
        // Fallback to DB even if network fails
        const { getRainyDatesFromDB } = await import('../models/weatherLog.js');
        return await getRainyDatesFromDB();
    }
};