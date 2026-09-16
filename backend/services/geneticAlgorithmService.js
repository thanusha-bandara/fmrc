import GeneticAlgorithm from 'geneticalgorithm';

const timeSlots = ["Full Day"];

const createRandomSchedule = (validTests, fields, tas, holidays = []) => {
    let schedule = {};

    // Give the GA more candidate days than there are tests, otherwise (e.g. with a
    // single pending test) there is only one possible day in the whole search space
    // and no amount of fitness penalty (TA leave, labour shortage, weather) can ever
    // move a test to a better day, because no other day exists to move it to.
    const requiredDays = validTests.length + 10;

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
        
        schedule[assignedDay].push({
            test,
            time_slot: randomTimeSlot,
            field_id: null,
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
        
        testAssignment.field_id = null;
        
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

    // Flattened once so lookups below match strictly by test_id and stop at the
    // first hit (the previous per-day loop kept overwriting its result with
    // whatever the *last* day in sched2 held, even when it wasn't the same test,
    // because the id fallback below used to compare two `undefined`s as equal).
    const sched2AssignmentsFlat = Object.values(sched2).flat();

    Object.keys(sched1).forEach(day => {
        sched1[day].forEach(assignment => {
            const takeFromSched1 = Math.random() > 0.5;

            if (takeFromSched1) {
                childSchedule[day].push(JSON.parse(JSON.stringify(assignment)));
            } else {
                // Find this same test in sched2
                const foundAssignment = sched2AssignmentsFlat.find(a => a.test.test_id === assignment.test.test_id);

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

    // The geneticalgorithm package calls crossoverFunction(a, b)[0] to get the child,
    // so this must return an array, not the schedule object directly.
    return [childSchedule];
};

export const runGA = (validTests, rainyDates = [], fields = [], tas = [], holidays = [], taLeaves = [], farmDailyStatus = {}) => {
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

            // LABOUR HEADCOUNT CONSTRAINT: how many labourers are actually free this day
            const labourOnLeaveToday = labourLeaves.filter(l => l.leave_date === dateStr).length;
            const availableLabourToday = Math.max(0, totalLabourCount - labourOnLeaveToday);

            assignments.forEach(assignment => {
                // Not enough labourers free this day for this test's crew requirement.
                // Scaled like the one-test-per-day rule so the GA reliably steers away from it.
                const requiredLabour = assignment.test.requiredLabourCount || 0;
                if (requiredLabour > availableLabourToday) {
                    score -= 5000 * (requiredLabour - availableLabourToday);
                }

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

                // Daily Global Farm Constraints for Field Tests
                if (assignment.test.isFieldTest) {
                    const dailyStatus = farmDailyStatus[dateStr];
                    if (dailyStatus) {
                        // Field unavailable today
                        if (!dailyStatus.is_field_available) {
                            score -= 500;
                        }
                        // Water required but unavailable today
                        if (assignment.test.requiresWater && !dailyStatus.is_water_available) {
                            score -= 500;
                        }
                    }
                }
            });
        });

        return score; 
    };

    const config = {
        population: initialPopulation,
        // NOTE: the `geneticalgorithm` package's actual option names are
        // fitnessFunction/mutationFunction/crossoverFunction (there is no
        // `optimization` option — it always maximizes via a.score >= b.score).
        // The old keys here (fitness/mutate/crossover/optimization) don't match
        // that API, so the library silently fell back to its no-op defaults
        // (fitness always 0, mutation/crossover as identity) and every
        // constraint below was never actually applied.
        fitnessFunction: calculateFitness,
        mutationFunction: (sched) => mutateSchedule(sched, fields, tas),
        crossoverFunction: crossoverSchedules
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