import { markHolidaySchedulesForRescheduling } from '../models/schedule.js';

export const handleRescheduleForHoliday = async (date) => {
    try {
        // Change the status of schedules on the holiday to 'Rescheduled'
        const affectedRows = await markHolidaySchedulesForRescheduling(date);
        
        console.log(`Rescheduled ${affectedRows} tests due to new holiday on ${date}.`);
        return affectedRows;
    } catch (error) {
        console.error("Error during reschedule process:", error.message);
        throw error;
    }
};
