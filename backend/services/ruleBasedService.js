export const filterAndSortTests = (pendingTests, currentSeason) => {
    
    const validTests = pendingTests.filter(test => {

        return test.requiredSeason === "Any" || test.requiredSeason === currentSeason;
    });

    const sortedTests = validTests.sort((a, b) => {

        const dateA = new Date(a.registrationDate);
        const dateB = new Date(b.registrationDate);
        
        return dateA - dateB; 
    });

    return sortedTests;
};