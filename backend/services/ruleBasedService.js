export const filterAndSortTests = (pendingTests, allSeasons) => {
    
    const validTests = pendingTests.filter(test => {
        if (test.requiredSeason === "Any") return true;
        // Keep the test if its required season exists ANYWHERE in the calendar
        return allSeasons.some(s => s.season_type === test.requiredSeason);
    });

    const sortedTests = validTests.sort((a, b) => {
        const dateA = new Date(a.registrationDate);
        const dateB = new Date(b.registrationDate);
        return dateA - dateB; 
    });

    return sortedTests;
};