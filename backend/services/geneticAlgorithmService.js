import GeneticAlgorithm from 'geneticalgorithm';
import { getValidWorkingDays } from './ruleBasedService.js';

const timeSlots = ["Full Day"];

const createRandomSchedule = (validTests, fields, tas, holidays = [], allSeasons = []) => {
    let schedule = {};
    
    // Generate up to 365 days using rule-based working days generator (skips weekends and holidays)
    const requiredDays = Math.max(365, validTests.length * 2);
    const days = getValidWorkingDays(requiredDays, holidays);

    const counters = { any: 0 };
    validTests.forEach((test) => {
        let assignedDay = null;

        if (test.requiredSeason && test.requiredSeason !== 'Any' && allSeasons && allSeasons.length > 0) {
            const validSeasonDays = days.filter(d => {
                return allSeasons.some(s => 
                    s.season_type === test.requiredSeason && 
                    d.dateObj >= new Date(s.start_date) && 
                    d.dateObj <= new Date(s.end_date)
                );
            });
            if (validSeasonDays.length > 0) {
                if (counters[test.requiredSeason] === undefined) counters[test.requiredSeason] = 0;
                let attempts = 0;
                while (attempts < validSeasonDays.length) {
                    const seasonIdx = counters[test.requiredSeason] % validSeasonDays.length;
                    const candidateDay = validSeasonDays[seasonIdx].dateString;
                    counters[test.requiredSeason]++;
                    if (!schedule[candidateDay] || schedule[candidateDay].length === 0) {
                        assignedDay = candidateDay;
                        break;
                    }
                    attempts++;
                }
            }
        }
        
        if (!assignedDay) {
            let attempts = 0;
            while (attempts < days.length) {
                const dayIndex = counters.any % days.length; 
                const candidateDay = days[dayIndex].dateString;
                counters.any++;
                if (!schedule[candidateDay] || schedule[candidateDay].length === 0) {
                    assignedDay = candidateDay;
                    break;
                }
                attempts++;
            }
            // fallback if totally full (shouldn't happen)
            if (!assignedDay) {
                assignedDay = days[counters.any % days.length].dateString;
                counters.any++;
            }
        }
        
        const randomTimeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
        let randomTA = tas.length > 0 ? tas[Math.floor(Math.random() * tas.length)] : null;
        
        if (test.requiredTA) {
            const matchedTA = tas.find(t => t.user_id === test.requiredTA);
            if (matchedTA) randomTA = matchedTA;
        }
        
        if (!schedule[assignedDay]) schedule[assignedDay] = [];
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
const mutateSchedule = (schedule, fields, tas, globalDays = []) => {
    let mutated = {};
    Object.keys(schedule).forEach(k => {
        mutated[k] = JSON.parse(JSON.stringify(schedule[k]));
    });

    const daysWithTests = Object.keys(mutated).filter(d => mutated[d].length > 0);
    if (daysWithTests.length === 0) return mutated;

    // Pick a random day that has tests
    const sourceDay = daysWithTests[Math.floor(Math.random() * daysWithTests.length)];
    if (mutated[sourceDay].length > 0) {
        // Pick a random test from that day
        const testIndex = Math.floor(Math.random() * mutated[sourceDay].length);
        const testToMove = mutated[sourceDay][testIndex];

        // Pick a random target day
        const allAvailableDays = globalDays.length > 0 ? globalDays : Object.keys(mutated);
        const targetDay = allAvailableDays[Math.floor(Math.random() * allAvailableDays.length)];

        if (sourceDay !== targetDay) {
            // Move it!
            mutated[sourceDay].splice(testIndex, 1);
            if (!mutated[targetDay]) mutated[targetDay] = [];
            mutated[targetDay].push(testToMove);
            testToMove.scheduled_date = targetDay;
        }

        // Also mutate its properties
        testToMove.time_slot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
        testToMove.field_id = null;
        if (testToMove.test.requiredTA) {
            testToMove.assigned_ta_id = testToMove.test.requiredTA;
        } else if (tas && tas.length > 0) {
            testToMove.assigned_ta_id = tas[Math.floor(Math.random() * tas.length)].user_id;
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
    Object.keys(sched2).forEach(day => {
        if (!childSchedule[day]) childSchedule[day] = [];
    });

    // Build a map for O(1) lookup of tests in sched2
    const sched2Map = {};
    Object.keys(sched2).forEach(d2 => {
        sched2[d2].forEach(a => {
            sched2Map[a.test.test_id || a.test.id] = a;
        });
    });

    Object.keys(sched1).forEach(day => {
        sched1[day].forEach(assignment => {
            const takeFromSched1 = Math.random() > 0.5;

            if (takeFromSched1) {
                childSchedule[day].push(JSON.parse(JSON.stringify(assignment)));
            } else {
                // Find this test in sched2 map
                let foundAssignment = sched2Map[assignment.test.test_id || assignment.test.id];
                
                if (foundAssignment) {
                    const targetDay = foundAssignment.scheduled_date;
                    childSchedule[targetDay].push(JSON.parse(JSON.stringify(foundAssignment)));
                } else {
                    childSchedule[day].push(JSON.parse(JSON.stringify(assignment)));
                }
            }
        });
    });

    return childSchedule;
};

export const runGA = (validTests, rainyDates = [], fields = [], tas = [], holidays = [], taLeaves = [], farmDailyStatus = {}, allSeasons = [], labourLeaves = []) => {
    if (validTests.length === 0) return { schedule: {}, score: 1000, accuracy: 100 };

    // Generate full days array once for mutation and crossover to know the universe of days
    const requiredDays = Math.max(365, validTests.length * 2);
    const workingDaysObj = getValidWorkingDays(requiredDays, holidays);
    const globalDays = workingDaysObj.map(d => d.dateString);

    let initialPopulation = [];
    for (let i = 0; i < 50; i++) {
        initialPopulation.push(createRandomSchedule(validTests, fields, tas, holidays, allSeasons));
    }

    // fitness function
    const calculateFitness = (schedule) => {
        let score = 1000;
        const taAssignments = {};
        const fieldAssignments = {};

        Object.entries(schedule).forEach(([dateStr, assignments]) => {
            // ONLY ONE TEST PER DAY CONSTRAINT
            // User explicitly requested ONLY ONE test per day across the entire institute
            if (assignments.length > 1) {
                score -= 50000 * (assignments.length - 1); 
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
                    // 1. Check TA double booking ON THE SAME DAY
                    const taKey = `${dateStr}-${assignment.assigned_ta_id}-${assignment.time_slot}`;
                    if (taAssignments[taKey]) {
                        score -= 50000; // HUGE penalty for double booking the SAME TA on the SAME day and timeslot
                    }
                    taAssignments[taKey] = true;
                    
                    // If time_slot is 'Full Day', they can't do Morning or Afternoon either
                    if (assignment.time_slot === 'Full Day') {
                        taAssignments[`${dateStr}-${assignment.assigned_ta_id}-Morning`] = true;
                        taAssignments[`${dateStr}-${assignment.assigned_ta_id}-Afternoon`] = true;
                    } else {
                        // If Morning/Afternoon, they can't do Full Day
                        taAssignments[`${dateStr}-${assignment.assigned_ta_id}-Full Day`] = true;
                    }

                    // 2. Check if TA is on leave this day
                    const isTAOnLeave = taLeaves.some(l => l.user_id === assignment.assigned_ta_id && l.leave_date === dateStr);
                    if (isTAOnLeave) {
                        score -= 5000; 
                    }

                    // 3. Check Expert TA preference
                    if (assignment.test.requiredTA && assignment.test.requiredTA !== assignment.assigned_ta_id) {
                        score -= 5000; 
                    } else if (assignment.test.requiredTA && assignment.test.requiredTA === assignment.assigned_ta_id) {
                        score += 500;
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

                // Skilled Labour Constraint Check
                if (assignment.test.requiredLabours && assignment.test.requiredLabours.length > 0) {
                    const requiredLabourIds = assignment.test.requiredLabours;
                    const availableLabours = requiredLabourIds.filter(labourId => {
                        const isLabourOnLeave = labourLeaves.some(l => l.labour_id === labourId && l.leave_date === dateStr);
                        return !isLabourOnLeave;
                    });
                    
                    // If all required labours are on leave, heavily penalize
                    if (availableLabours.length === 0) {
                        score -= 5000;
                    }
                }

                // Season Constraint Check
                const reqSeason = assignment.test.requiredSeason;
                if (reqSeason && reqSeason !== 'Any' && allSeasons && allSeasons.length > 0) {
                    const assignedDateObj = new Date(dateStr);
                    const isInSeason = allSeasons.some(s => {
                        return s.season_type === reqSeason && 
                               assignedDateObj >= new Date(s.start_date) && 
                               assignedDateObj <= new Date(s.end_date);
                    });
                    
                    if (!isInSeason) {
                        score -= 5000; // Big penalty for scheduling on a day outside the required season
                    } else {
                        score += 200;  // Reward for matching the correct season day
                    }
                }
            });
        });

        return score; 
    };

    const config = {
        population: initialPopulation,
        fitness: calculateFitness,
        mutate: (sched) => mutateSchedule(sched, fields, tas, globalDays),
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

        // Check if swap would cause TA collision
        const ftTaId = ft.assignment.assigned_ta_id;
        const ltTaId = lt.assignment.assigned_ta_id;
        
        const ftTargetDayTests = bestSchedule[lt.dateStr] || [];
        const ltTargetDayTests = bestSchedule[ft.dateStr] || [];
        
        const ftCollision = ftTargetDayTests.some(a => a !== lt.assignment && a.assigned_ta_id === ftTaId);
        const ltCollision = ltTargetDayTests.some(a => a !== ft.assignment && a.assigned_ta_id === ltTaId);
        
        if (ftCollision || ltCollision) {
            continue; // Skip swap to prevent TA double booking
        }

        // Swap without overwriting other tests on the same day
        bestSchedule[ft.dateStr] = bestSchedule[ft.dateStr].filter(a => a !== ft.assignment);
        bestSchedule[ft.dateStr].push(lt.assignment);
        
        bestSchedule[lt.dateStr] = bestSchedule[lt.dateStr].filter(a => a !== lt.assignment);
        bestSchedule[lt.dateStr].push(ft.assignment);
        
        lt.assignment.scheduled_date = ft.dateStr;
        ft.assignment.scheduled_date = lt.dateStr;
    }

    const finalScore = calculateFitness(bestSchedule);
    let accuracy = 100;
    if (finalScore < 1000) {
        // Just a heuristic mapping for display
        accuracy = Math.max(0, 100 - Math.abs(finalScore) / 50);
    }
    
    return { schedule: bestSchedule, score: finalScore, accuracy: Math.round(accuracy) };
};