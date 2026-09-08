import db from '../config/db.js';

export const getPendingTests = async () => {
    const [tests] = await db.query(`
        SELECT
            tr.test_id,
            tr.test_name,
            tr.is_field_test,
            tr.requires_water,
            tr.required_season,
            tr.technical_assistant_id,
            m.registration_date as registrationDate,
            m.machine_name
        FROM Test_Records tr
        JOIN Machinery m ON tr.machine_id = m.machine_id
        LEFT JOIN Schedules s ON tr.test_id = s.test_id
        WHERE s.test_id IS NULL OR s.status IN ('Scheduled', 'Rescheduled', 'Cancelled')
    `);

    // Map the database rows to the format expected by the scheduling algorithm
    return tests.map(t => {
        return {
            test_id: t.test_id,
            test_name: t.test_name,
            registrationDate: t.registrationDate,
            machineName: t.machine_name,
            isFieldTest: Boolean(t.is_field_test),
            requiredSeason: t.required_season || "Any",
            requiresWater: Boolean(t.requires_water),
            requiredTA: t.technical_assistant_id || null
        };
    });
};

const DETAIL_SELECT = `
    SELECT
        tr.*,
        m.machine_name,
        m.model AS machine_model,
        m.supplier AS machine_supplier,
        ta.full_name AS technical_assistant_name,
        me.full_name AS mechanical_engineer_name,
        ce.full_name AS chief_engineer_name,
        s.schedule_id,
        s.scheduled_date,
        s.time_slot,
        s.assigned_ta_id,
        s.field_id,
        s.status AS schedule_status
    FROM Test_Records tr
    JOIN Machinery m ON tr.machine_id = m.machine_id
    LEFT JOIN Users ta ON tr.technical_assistant_id = ta.user_id
    LEFT JOIN Users me ON tr.mechanical_engineer_id = me.user_id
    LEFT JOIN Users ce ON tr.chief_engineer_id = ce.user_id
    LEFT JOIN Schedules s ON s.test_id = tr.test_id
`;

// Create a new test request for a machine (Admin / Mechanical Engineer).
export const createTestRecord = async ({ machine_id, test_name, is_field_test, requires_water, required_season, technical_assistant_id }) => {
    const [result] = await db.query(
        `INSERT INTO Test_Records (machine_id, test_name, is_field_test, requires_water, required_season, technical_assistant_id, status)
         VALUES (?, ?, ?, ?, ?, ?, 'Draft')`,
        [
            machine_id,
            test_name,
            is_field_test ?? true,
            requires_water ?? false,
            required_season || "Any",
            technical_assistant_id || null
        ]
    );
    return getTestRecordById(result.insertId);
};

export const getTestRecordById = async (testId) => {
    const [rows] = await db.query(`${DETAIL_SELECT} WHERE tr.test_id = ?`, [testId]);
    return rows[0] || null;
};

// List test records with optional filters, used to drive each role's
// dashboard (assigned / pending / completed views).
export const listTestRecords = async ({ status, machineId, technicalAssistantId, assignedTaId } = {}) => {
    const conditions = [];
    const params = [];

    if (status) {
        conditions.push("tr.status = ?");
        params.push(status);
    }
    if (machineId) {
        conditions.push("tr.machine_id = ?");
        params.push(machineId);
    }
    if (technicalAssistantId) {
        conditions.push("tr.technical_assistant_id = ?");
        params.push(technicalAssistantId);
    }
    if (assignedTaId) {
        conditions.push("s.assigned_ta_id = ?");
        params.push(assignedTaId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await db.query(`${DETAIL_SELECT} ${where} ORDER BY tr.created_at DESC`, params);
    return rows;
};

// TA saves field data (partial saves allowed while status is still Draft).
export const saveTestFormData = async (testId, formData) => {
    await db.query(`UPDATE Test_Records SET form_data = ? WHERE test_id = ?`, [JSON.stringify(formData), testId]);
    return getTestRecordById(testId);
};

// TA finalizes data entry -> moves the record into the review queue.
export const submitTestRecord = async (testId) => {
    await db.query(
        `UPDATE Test_Records SET status = 'Submitted', submitted_at = CURRENT_TIMESTAMP WHERE test_id = ?`,
        [testId]
    );
    
    // Mark the physical field test as completed in the schedule so it appears completed on the calendar
    await db.query(
        `UPDATE Schedules SET status = 'Completed' WHERE test_id = ? AND status IN ('Scheduled', 'Rescheduled')`,
        [testId]
    );
    
    return getTestRecordById(testId);
};

// Mechanical Engineer reviews the submitted data and recommends / does not recommend it.
export const reviewTestRecord = async (testId, mechanicalEngineerId, recommendation, comments) => {
    await db.query(
        `UPDATE Test_Records SET
            status = 'Reviewed',
            mechanical_engineer_id = ?,
            me_recommendation = ?,
            me_comments = ?,
            reviewed_at = CURRENT_TIMESTAMP
         WHERE test_id = ?`,
        [mechanicalEngineerId, recommendation, comments || null, testId]
    );
    return getTestRecordById(testId);
};

// Chief Engineer gives final approval -> triggers report generation, or rejects the record.
export const decideTestRecord = async (testId, chiefEngineerId, decision, comments) => {
    await db.query(
        `UPDATE Test_Records SET
            status = ?,
            chief_engineer_id = ?,
            ce_comments = ?,
            approved_at = CURRENT_TIMESTAMP
         WHERE test_id = ?`,
        [decision, chiefEngineerId, comments || null, testId]
    );
    return getTestRecordById(testId);
};

export const deleteTestRecord = async (testId) => {
    const [result] = await db.query(`DELETE FROM Test_Records WHERE test_id = ?`, [testId]);
    return result.affectedRows > 0;
};

// Used by the Rule-Based Predictive Estimation module to gauge current queue depth.
export const countActiveTestsForMachineType = async (testName) => {
    const [rows] = await db.query(
        `SELECT COUNT(*) AS pending_count
         FROM Test_Records
         WHERE test_name = ? AND status IN ('Draft', 'Submitted', 'Reviewed')`,
        [testName]
    );
    return rows[0].pending_count;
};
