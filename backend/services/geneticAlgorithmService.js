import GeneticAlgorithm from 'geneticalgorithm';

const timeSlots = ["Full Day"];

const createRandomSchedule = (validTests, fields, tas, holidays = []) => {
    let schedule = {};
    
    const requiredDays = validTests.length;
    
    let startDate = new Date();
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
        
        // Skip Saturdays , Sundays , and holidays 
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dateString)) {
            schedule[dateString] = [];
            days.push(dateString);
        }
        i++;
    }


    validTests.forEach((test, index) => {
    
        const dayIndex = index % days.length; 
        const assignedDay = days[dayIndex];
        
        const randomTimeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
        const randomTA = tas.length > 0 ? tas[Math.floor(Math.random() * tas.length)] : null;
        
        let randomField = null;
        if (test.isFieldTest && fields.length > 0) {
            randomField = fields[Math.floor(Math.random() * fields.length)];
        }
        
        schedule[assignedDay].push({
            test,
            time_slot: randomTimeSlot,
            field_id: randomField ? randomField.field_id : null,
            assigned_ta_id: randomTA ? randomTA.user_id : null,
            scheduled_date: assignedDay
        });
    });

    return schedule;
};

// mutation
const mutateSchedule = (schedule, fields, tas) => {
    let mutated = JSON.parse(JSON.stringify(schedule));
    const days = Object.keys(mutated);

    if (days.length === 0) return mutated;

    const randomDay1 = days[Math.floor(Math.random() * days.length)];
    const randomDay2 = days[Math.floor(Math.random() * days.length)];

    if (randomDay1 !== randomDay2) {
        // Swap tests between the two days
        const tests1 = mutated[randomDay1];
        const tests2 = mutated[randomDay2];
        
        mutated[randomDay1] = tests2;
        mutated[randomDay2] = tests1;
        
        // Update their scheduled_date property
        mutated[randomDay1].forEach(t => t.scheduled_date = randomDay1);
        mutated[randomDay2].forEach(t => t.scheduled_date = randomDay2);
    }

    // Mutate the properties of a random test
    const daysWithTests = days.filter(d => mutated[d].length > 0);
    if (daysWithTests.length > 0) {
        const mutateDay = daysWithTests[Math.floor(Math.random() * daysWithTests.length)];
        const testIndex = Math.floor(Math.random() * mutated[mutateDay].length);
        const testAssignment = mutated[mutateDay][testIndex];

        testAssignment.time_slot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
        
        if (testAssignment.test.isFieldTest && fields && fields.length > 0) {
            testAssignment.field_id = fields[Math.floor(Math.random() * fields.length)].field_id;
        } else {
            testAssignment.field_id = null;
        }
        
        if (tas && tas.length > 0) {
            testAssignment.assigned_ta_id = tas[Math.floor(Math.random() * tas.length)].user_id;
        }
    }

    return mutated;
    

};

// crossover
const crossoverSchedules = (sched1, sched2) => {
    let childSchedule = {};
    
    Object.keys(sched1).forEach(day => {
        childSchedule[day] = [];
    });

    Object.keys(sched1).forEach(day => {
        sched1[day].forEach(assignment => {
            const takeFromSched1 = Math.random() > 0.5;

            if (takeFromSched1) {
                childSchedule[day].push(JSON.parse(JSON.stringify(assignment)));
            } else {
                // Find this test in sched2
                let foundAssignment = null;
                Object.keys(sched2).forEach(d2 => {
                    const found = sched2[d2].find(a => a.test.test_id === assignment.test.test_id || a.test.id === assignment.test.id);
                    if (found) {
                        foundAssignment = found;
                    }
                });
                
                if (foundAssignment) {
                    const targetDay = foundAssignment.scheduled_date;
                    if (!childSchedule[targetDay]) {
                        childSchedule[targetDay] = [];
                    }
                    childSchedule[targetDay].push(JSON.parse(JSON.stringify(foundAssignment)));
                } else {
                    childSchedule[day].push(JSON.parse(JSON.stringify(assignment)));
                }
            }
        });
    });

    return childSchedule;
};

export const runGA = (validTests, rainyDates = [], fields = [], tas = [], holidays = [], taLeaves = []) => {
    if (validTests.length === 0) return {};

    let initialPopulation = [];
    for (let i = 0; i < 50; i++) {
        initialPopulation.push(createRandomSchedule(validTests, fields, tas, holidays));
    }

    // fitness function
    const calculateFitness = (schedule) => {
        let score = 1000;
        const taAssignments = {};
        const fieldAssignments = {};

        Object.entries(schedule).forEach(([dateStr, assignments]) => {
            // ONLY ONE TEST PER DAY CONSTRAINT
            if (assignments.length > 1) {
                score -= 5000 * (assignments.length - 1); 
            }

            assignments.forEach(assignment => {
                // Weather check optimization
                if (assignment.test.isFieldTest) {
                    if (rainyDates.includes(dateStr)) {
                        score -= 500; 
                    } else {
                        score += 50; 
                    }
                } else {
                    // It's a Lab Test
                    if (rainyDates.includes(dateStr)) {
                        score += 50; 
                    }
                }

                // TA Logic
                if (assignment.assigned_ta_id) {
                    // 1. Check TA double booking
                    const taKey = `${assignment.assigned_ta_id}-${assignment.time_slot}`;
                    if (taAssignments[taKey]) {
                        score -= 100; 
                    }
                    taAssignments[taKey] = true;

                    // 2. Check if TA is on leave this day
                    const isTAOnLeave = taLeaves.some(l => l.user_id === assignment.assigned_ta_id && l.leave_date === dateStr);
                    if (isTAOnLeave) {
                        score -= 100; 
                    }

                    // 3. Check Expert TA preference
                    if (assignment.test.requiredTA && assignment.test.requiredTA !== assignment.assigned_ta_id) {
                        score -= 50; 
                    }
                }

                // Check Field double booking & Water availability
                if (assignment.field_id) {
                    const fieldKey = `${assignment.field_id}-${assignment.time_slot}`;
                    if (fieldAssignments[fieldKey]) {
                        score -= 100; 
                    }
                    fieldAssignments[fieldKey] = true;
                    
                    // Water check
                    if (assignment.test.requiresWater) {
                        const assignedField = fields.find(f => f.field_id === assignment.field_id);
                        if (assignedField && !assignedField.water_available) {
                            score -= 100; 
                        }
                    }
                }
            });
        });

        return score; 
    };

    const config = {
        population: initialPopulation,
        fitness: calculateFitness,
        mutate: (sched) => mutateSchedule(sched, fields, tas),
        crossover: crossoverSchedules,
        optimization: 'maximum'
    };

    const ga = GeneticAlgorithm(config);
    
    // Fast evolution
    for (let i = 0; i < 1000; i++) {
        ga.evolve();
    }

    let bestSchedule = ga.best();

    // Memetic Algorithm 
    let fieldTestsOnRainyDays = [];
    let labTestsOnSunnyDays = [];

    Object.entries(bestSchedule).forEach(([dateStr, assignments]) => {
        assignments.forEach(assignment => {
            if (assignment.test.isFieldTest && rainyDates.includes(dateStr)) {
                fieldTestsOnRainyDays.push({dateStr, assignment});
            } else if (!assignment.test.isFieldTest && !rainyDates.includes(dateStr)) {
                labTestsOnSunnyDays.push({dateStr, assignment});
            }
        });
    });

    for (let i = 0; i < Math.min(fieldTestsOnRainyDays.length, labTestsOnSunnyDays.length); i++) {
        const ft = fieldTestsOnRainyDays[i];
        const lt = labTestsOnSunnyDays[i];

        bestSchedule[ft.dateStr] = [lt.assignment];
        bestSchedule[lt.dateStr] = [ft.assignment];
        
        lt.assignment.scheduled_date = ft.dateStr;
        ft.assignment.scheduled_date = lt.dateStr;
    }

    return bestSchedule;
};