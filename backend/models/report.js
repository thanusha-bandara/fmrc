import db from '../config/db.js';

export const createReport = async ({ test_id, machine_id, report_type, pdf_file_path, approved_by, certification_status, ce_status }) => {
    const [result] = await db.query(
        `INSERT INTO Reports (test_id, machine_id, report_type, pdf_file_path, approved_by, certification_status, ce_status)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            pdf_file_path = VALUES(pdf_file_path),
            approved_by = VALUES(approved_by),
            certification_status = VALUES(certification_status),
            ce_status = VALUES(ce_status),
            approval_date = CURRENT_TIMESTAMP`,
        [test_id || null, machine_id || null, report_type, pdf_file_path, approved_by || null, certification_status || 'Certified', ce_status || 'Pending']
    );
    if (result.insertId) return getReportById(result.insertId);
    if (machine_id) return getReportByMachineId(machine_id);
    return getReportByTestId(test_id);
};

// approved_by is NULL for a report that's still pending Chief Engineer approval (created by
// ME's Finalize Report action -- see finalReportController.js), so these joins must be LEFT
// joins or a pending report would vanish from every query below.
export const getAllReports = async () => {
    const [rows] = await db.query(`
        SELECT r.*, ANY_VALUE(m.machine_name) AS machine_name, ANY_VALUE(u.full_name) AS approved_by_name
        FROM Reports r
        JOIN Machinery m ON r.machine_id = m.machine_id OR r.test_id IN (SELECT test_id FROM Test_Records WHERE machine_id = m.machine_id)
        LEFT JOIN Users u ON r.approved_by = u.user_id
        GROUP BY r.report_id
        ORDER BY r.approval_date DESC
    `);
    return rows;
};

export const getReportById = async (reportId) => {
    const [rows] = await db.query(`
        SELECT r.*, m.machine_name, u.full_name AS approved_by_name
        FROM Reports r
        JOIN Machinery m ON r.machine_id = m.machine_id OR r.test_id IN (SELECT test_id FROM Test_Records WHERE machine_id = m.machine_id)
        LEFT JOIN Users u ON r.approved_by = u.user_id
        WHERE r.report_id = ?
        LIMIT 1
    `, [reportId]);
    return rows[0] || null;
};

export const getReportByTestId = async (testId) => {
    const [rows] = await db.query(`
        SELECT r.*, m.machine_name, u.full_name AS approved_by_name
        FROM Reports r
        JOIN Test_Records tr ON r.test_id = tr.test_id
        JOIN Machinery m ON tr.machine_id = m.machine_id
        LEFT JOIN Users u ON r.approved_by = u.user_id
        WHERE r.test_id = ?
        LIMIT 1
    `, [testId]);
    return rows[0] || null;
};

export const getReportByMachineId = async (machineId) => {
    const [rows] = await db.query(`
        SELECT r.*, m.machine_name, u.full_name AS approved_by_name
        FROM Reports r
        JOIN Machinery m ON r.machine_id = m.machine_id
        LEFT JOIN Users u ON r.approved_by = u.user_id
        WHERE r.machine_id = ?
        ORDER BY r.approval_date DESC
        LIMIT 1
    `, [machineId]);
    return rows[0] || null;
};

// Chief Engineer's decision on a compiled final report (Approve/Reject the report as a whole,
// not each of its underlying tests -- see the Finalize Report / Reports for Approval flow).
export const updateReportDecision = async (reportId, chiefEngineerId, decision, comments) => {
    await db.query(
        `UPDATE Reports SET ce_status = ?, approved_by = ?, ce_comments = ?, decided_at = CURRENT_TIMESTAMP WHERE report_id = ?`,
        [decision, chiefEngineerId, comments || null, reportId]
    );
    return getReportById(reportId);
};

export const getPendingReports = async () => {
    const [rows] = await db.query(`
        SELECT r.*, ANY_VALUE(m.machine_name) AS machine_name, ANY_VALUE(m.model) AS machine_model
        FROM Reports r
        JOIN Machinery m ON r.machine_id = m.machine_id OR r.test_id IN (SELECT test_id FROM Test_Records WHERE machine_id = m.machine_id)
        WHERE r.ce_status = 'Pending'
        GROUP BY r.report_id
        ORDER BY r.approval_date ASC
    `);
    return rows;
};
