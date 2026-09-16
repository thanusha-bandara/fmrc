import db from '../config/db.js';
import { CATALOGS } from '../config/standardTestCatalog.js';

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

// Admin / Mechanical Engineer: create a machine type's fixed standard test set (e.g. the
// 4-Wheel Tractor's 18 tests, or the Combine Harvester's 19) for a machine in one go. Wrapped
// in a transaction since there's no uniqueness constraint on (machine_id, test_name) -- a
// partial failure without one would leave an unrecoverable mixed state (no way to tell what's
// missing vs. safe to re-run).
export const bulkCreateStandardTestRecords = async (machineId, catalogKey) => {
    const catalog = CATALOGS[catalogKey];
    if (!catalog) {
        throw new Error(`Unknown catalog_key "${catalogKey}". Valid keys: ${Object.keys(CATALOGS).join(", ")}`);
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // schema_key -> schema_id, so each catalog entry can attach its structured form.
        // A key with no matching row (schemas not seeded yet) falls back to NULL, which
        // degrades gracefully to the legacy free-form editor for that test.
        const [schemaRows] = await conn.query(`SELECT schema_id, schema_key FROM Test_Form_Schemas`);
        const schemaIdByKey = {};
        schemaRows.forEach((row) => { schemaIdByKey[row.schema_key] = row.schema_id; });

        const insertedIds = [];
        for (const entry of catalog) {
            const [result] = await conn.query(
                `INSERT INTO Test_Records (machine_id, test_name, is_field_test, requires_water, required_season, schema_id, group_key, catalog_key, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Draft')`,
                [
                    machineId,
                    entry.test_name,
                    entry.is_field_test,
                    entry.requires_water,
                    entry.required_season,
                    schemaIdByKey[entry.schema_key] || null,
                    entry.group_key || null,
                    catalogKey
                ]
            );
            insertedIds.push(result.insertId);
        }
        await conn.commit();
        const created = [];
        for (const id of insertedIds) {
            created.push(await getTestRecordById(id));
        }
        return created;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
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

// ME's Finalize Report submission: `selections` is { [group_key]: test_id }, one chosen
// replicate per implement group. Ticks the chosen test and un-ticks its siblings, for every
// group in one transaction.
export const applyFinalReportSelections = async (machineId, selections) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        for (const [groupKey, testId] of Object.entries(selections)) {
            await conn.query(
                `UPDATE Test_Records SET include_in_final_report = FALSE WHERE machine_id = ? AND group_key = ? AND test_id != ?`,
                [machineId, groupKey, testId]
            );
            await conn.query(
                `UPDATE Test_Records SET include_in_final_report = TRUE WHERE test_id = ?`,
                [testId]
            );
        }
        await conn.commit();
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

// Derives a human label for an implement-replicate group from its first test's name, e.g.
// "Highland Field Test - Tine Tiller (Test 1)" -> "Highland Field Test - Tine Tiller".
const implementLabelFromTestName = (testName) => testName.replace(/\s*\(Test \d+\)\s*$/, "");

// Powers the ME's Finalize Report screen: every catalog-driven test for a machine, bucketed
// into its 3-replicate implement groups (Highland/Lowland) and the singular tests (Lab/Speed/
// Transport/Endurance), plus whether every one of them has been reviewed yet.
export const getFinalizeStatusForMachine = async (machineId) => {
    const [tests] = await db.query(
        `${DETAIL_SELECT} WHERE tr.machine_id = ? AND tr.catalog_key IS NOT NULL ORDER BY tr.test_id ASC`,
        [machineId]
    );

    const groupsByKey = {};
    const singular = [];
    for (const t of tests) {
        if (t.group_key) {
            if (!groupsByKey[t.group_key]) {
                groupsByKey[t.group_key] = {
                    group_key: t.group_key,
                    implement_label: implementLabelFromTestName(t.test_name),
                    tests: []
                };
            }
            groupsByKey[t.group_key].tests.push(t);
        } else {
            singular.push(t);
        }
    }

    const notReviewedCount = tests.filter((t) => t.status === "Draft" || t.status === "Submitted").length;

    const [reportRows] = await db.query(
        `SELECT * FROM Reports WHERE machine_id = ? ORDER BY approval_date DESC LIMIT 1`,
        [machineId]
    );

    return {
        totalCount: tests.length,
        ready: tests.length > 0 && notReviewedCount === 0,
        notReviewedCount,
        groups: Object.values(groupsByKey),
        singular,
        existingReport: reportRows[0] || null
    };
};

// Mechanical Engineer reviews the submitted data and recommends / does not recommend it.
// Marking which test's data feeds the official final report happens later, on the dedicated
// Finalize Report screen (see getFinalizeStatusForMachine / finalizeReport), not during review.
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

// Cascades a Chief Engineer's single approve decision on a compiled 4-Wheel Tractor report
// (see reportController.js#decideReport) down to every underlying test -- individual tests
// under this flow never go through decideTestRecord themselves (see testController.js#decideTest's
// FOUR_WHEEL_TRACTOR guard), so without this they'd stay 'Reviewed' forever, which hides them
// from the TA/ME/CE "completed" history queues (RoleTestList.jsx bucketize requires
// status Approved/Rejected there) even after the machine is fully certified.
export const approveAllTestsForMachine = async (machineId, chiefEngineerId) => {
    await db.query(
        `UPDATE Test_Records SET
            status = 'Approved',
            chief_engineer_id = ?,
            approved_at = CURRENT_TIMESTAMP
         WHERE machine_id = ? AND catalog_key = 'FOUR_WHEEL_TRACTOR' AND status = 'Reviewed'`,
        [chiefEngineerId, machineId]
    );
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
