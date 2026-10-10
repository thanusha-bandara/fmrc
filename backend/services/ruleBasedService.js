export const filterAndSortTests = (pendingTests, allSeasons) => {
    // Institutional Priority Rule: Strictly sort tests by registration date (FCFS)
    const sortedTests = [...pendingTests].sort((a, b) => {
        const dateA = new Date(a.registrationDate);
        const dateB = new Date(b.registrationDate);
        return dateA - dateB; 
    });

    return sortedTests;
};

/**
 * Deterministic Calendar Rule:
 * Filters out Saturdays, Sundays, and FMRC public/institutional holidays
 * to produce the universe of eligible working days.
 */
export const getValidWorkingDays = (requiredDays, holidays = [], startDate = new Date()) => {
    const days = [];
    let i = 0;
    while (days.length < requiredDays) {
        let nextDate = new Date(startDate);
        nextDate.setDate(startDate.getDate() + i + 1);
        
        let yyyy = nextDate.getFullYear();
        let mm = String(nextDate.getMonth() + 1).padStart(2, '0');
        let dd = String(nextDate.getDate()).padStart(2, '0');
        let dateString = `${yyyy}-${mm}-${dd}`;
        let dayOfWeek = nextDate.getDay();
        
        // Institutional Rule: Skip Saturdays (6), Sundays (0), and gazetted holidays
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dateString)) {
            days.push({ dateString, dateObj: nextDate });
        }
        i++;
    }
    return days;
};