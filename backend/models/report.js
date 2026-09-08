import db from '../config/db.js';

export const createReport = async ({ test_id, machine_id, report_type, pdf_file_path, approved_by, certification_status }) => {
    const [result] = await db.query(
        `INSERT INTO Reports (test_id, machine_id, report_type, pdf_file_path, approved_by, certification_status)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            pdf_file_path = VALUES(pdf_file_path),
            approved_by = VALUES(approved_by),
            certification_status = VALUES(certification_status),
            approval_date = CURRENT_TIMESTAMP`,
        [test_id || null, machine_id || null, report_type, pdf_file_path, approved_by, certification_status || 'Certified']
    );
    if (result.insertId) return getReportById(result.insertId);
    if (machine_id) return getReportByMachineId(machine_id);
    return getReportByTestId(test_id);
};

export const getAllReports = async () => {
    const [rows] = await db.query(`
        SELECT r.*, m.machine_name, u.full_name AS approved_by_name
        FROM Reports r
        JOIN Machinery m ON r.machine_id = m.machine_id OR r.test_id IN (SELECT test_id FROM Test_Records WHERE machine_id = m.machine_id)
        JOIN Users u ON r.approved_by = u.user_id
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
        JOIN Users u ON r.approved_by = u.user_id
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
        JOIN Users u ON r.approved_by = u.user_id
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
        JOIN Users u ON r.approved_by = u.user_id
        WHERE r.machine_id = ?
        LIMIT 1
    `, [machineId]);
    return rows[0] || null;
};
