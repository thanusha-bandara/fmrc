import db from '../config/db.js';

export const getSchedulableTests = async () => {
    const [tests] = await db.query(`
        SELECT
            tr.test_id,
            tr.test_name,
            tr.is_field_test,
            tr.requires_water,
            tr.required_season,
            tr.technical_assistant_id,
            m.registration_date as registrationDate,
            m.machine_name,
            m.responsible_ta_id as machine_responsible_ta,
            m.required_labours,
            MAX(s.schedule_id) as schedule_id
        FROM Test_Records tr
        JOIN Machinery m ON tr.machine_id = m.machine_id
        LEFT JOIN Schedules s ON tr.test_id = s.test_id
        WHERE (s.test_id IS NULL OR s.status IN ('Scheduled', 'Rescheduled', 'Cancelled'))
          AND tr.status = 'Draft'
          AND COALESCE(m.is_on_hold, 0) = 0
        GROUP BY tr.test_id
    `);
    return tests;
};

export const listSchedules = async () => {
    const [schedules] = await db.query(`
        SELECT
            s.schedule_id,
            s.scheduled_date,
            s.time_slot,
            s.status,
            t.test_name,
            t.is_field_test,
            m.machine_name,
            u.full_name as assigned_ta_name
        FROM Schedules s
        JOIN Test_Records t ON s.test_id = t.test_id
        JOIN Machinery m ON t.machine_id = m.machine_id
        LEFT JOIN Users u ON s.assigned_ta_id = u.user_id
        ORDER BY s.scheduled_date ASC, s.time_slot ASC
    `);
    return schedules;
};

export const persistSchedule = async (testIds, bestSchedule) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        if (testIds.length > 0) {
            await connection.query(`DELETE FROM Schedules WHERE test_id IN (?) AND status IN ('Scheduled', 'Rescheduled')`, [testIds]);
        }

        for (const assignments of Object.values(bestSchedule)) {
            for (const assignment of assignments) {
                await connection.query(`
                    INSERT INTO Schedules (test_id, assigned_ta_id, scheduled_date, time_slot, status)
                    VALUES (?, ?, ?, ?, 'Scheduled')
                `, [
                    assignment.test.test_id,
                    assignment.assigned_ta_id,
                    assignment.scheduled_date,
                    assignment.time_slot
                ]);
            }
        }

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        console.error("Error in persistSchedule:", error.message);
        throw error;
    } finally {
        connection.release();
    }
};

export const markHolidaySchedulesForRescheduling = async (date) => {
    const [result] = await db.query(
        `UPDATE Schedules
         SET status = 'Rescheduled', reschedule_reason = 'Declared as a Holiday'
         WHERE scheduled_date = ? AND status IN ('Scheduled', 'In-Progress')`,
        [date]
    );
    return result.affectedRows;
};
