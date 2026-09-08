import db from '../config/db.js';

export const handleRescheduleForHoliday = async (date) => {
    try {
        // Change the status of schedules on the holiday to 'Rescheduled'
        const [result] = await db.query(
            `UPDATE Schedules 
             SET status = 'Rescheduled', reschedule_reason = 'Declared as a Holiday' 
             WHERE scheduled_date = ? AND status IN ('Scheduled', 'In-Progress')`,
            [date]
        );
        
        console.log(`Rescheduled ${result.affectedRows} tests due to new holiday on ${date}.`);
        return result.affectedRows;
    } catch (error) {
        console.error("Error during reschedule process:", error.message);
        throw error;
    }
};
