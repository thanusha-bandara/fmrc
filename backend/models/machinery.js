import db from '../config/db.js';

export const createMachinery = async ({ machine_name, model, supplier, registration_date, responsible_ta_id, required_labours }) => {
    const [result] = await db.query(
        `INSERT INTO Machinery (machine_name, model, supplier, registration_date, responsible_ta_id, required_labours) VALUES (?, ?, ?, ?, ?, ?)`,
        [
            machine_name, model || null, supplier || null, registration_date, 
            responsible_ta_id || null, 
            required_labours ? JSON.stringify(required_labours) : null
        ]
    );
    return getMachineryById(result.insertId);
};

export const getAllMachinery = async () => {
    const [rows] = await db.query(`
        SELECT
            m.*,
            COUNT(tr.test_id) AS total_tests,
            SUM(CASE WHEN tr.status = 'Approved' THEN 1 ELSE 0 END) AS approved_tests,
            (SELECT COUNT(*) FROM Reports r WHERE r.machine_id = m.machine_id AND r.ce_status = 'Approved') AS has_approved_report,
            (SELECT r.ce_status FROM Reports r WHERE r.machine_id = m.machine_id ORDER BY r.approval_date DESC LIMIT 1) AS report_ce_status,
            (SELECT r.ce_comments FROM Reports r WHERE r.machine_id = m.machine_id ORDER BY r.approval_date DESC LIMIT 1) AS report_ce_comments
        FROM Machinery m
        LEFT JOIN Test_Records tr ON tr.machine_id = m.machine_id
        GROUP BY m.machine_id
        ORDER BY m.created_at DESC
    `);
    return rows;
};

export const getMachineryById = async (machineId) => {
    const [rows] = await db.query(`SELECT * FROM Machinery WHERE machine_id = ?`, [machineId]);
    return rows[0] || null;
};

export const updateMachinery = async (machineId, {
    machine_name, model, supplier, registration_date,
    document_ref_number, manufacturer_country,
    importer_name, importer_address, importer_tel, importer_fax, importer_web,
    rops_available, safety_note, background_note, responsible_ta_id, required_labours
}) => {
    await db.query(
        `UPDATE Machinery SET
            machine_name = COALESCE(?, machine_name),
            model = COALESCE(?, model),
            supplier = COALESCE(?, supplier),
            registration_date = COALESCE(?, registration_date),
            document_ref_number = COALESCE(?, document_ref_number),
            manufacturer_country = COALESCE(?, manufacturer_country),
            importer_name = COALESCE(?, importer_name),
            importer_address = COALESCE(?, importer_address),
            importer_tel = COALESCE(?, importer_tel),
            importer_fax = COALESCE(?, importer_fax),
            importer_web = COALESCE(?, importer_web),
            rops_available = COALESCE(?, rops_available),
            safety_note = COALESCE(?, safety_note),
            background_note = COALESCE(?, background_note),
            responsible_ta_id = ?,
            required_labours = ?
         WHERE machine_id = ?`,
        [
            machine_name ?? null, model ?? null, supplier ?? null, registration_date ?? null,
            document_ref_number ?? null, manufacturer_country ?? null,
            importer_name ?? null, importer_address ?? null, importer_tel ?? null, importer_fax ?? null, importer_web ?? null,
            rops_available ?? null, safety_note ?? null, background_note ?? null,
            responsible_ta_id !== undefined ? responsible_ta_id : null,
            required_labours !== undefined ? JSON.stringify(required_labours) : null,
            machineId
        ]
    );
    return getMachineryById(machineId);
};

export const deleteMachinery = async (machineId) => {
    const [result] = await db.query(`DELETE FROM Machinery WHERE machine_id = ?`, [machineId]);
    return result.affectedRows > 0;
};

export const setMachineHoldStatus = async (machineId, isOnHold, holdReason) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query(
            `UPDATE Machinery SET is_on_hold = ?, hold_reason = ? WHERE machine_id = ?`,
            [Boolean(isOnHold), isOnHold ? (holdReason || null) : null, machineId]
        );

        if (isOnHold) {
            // Preserve the assigned TA on Test_Records before removing the active schedule so
            // the TA still sees their saved drafts while on hold and gets reassigned on unhold.
            await conn.query(
                `UPDATE Test_Records tr
                 JOIN Schedules s ON s.test_id = tr.test_id
                 SET tr.technical_assistant_id = COALESCE(tr.technical_assistant_id, s.assigned_ta_id)
                 WHERE tr.machine_id = ? AND tr.status = 'Draft'`,
                [machineId]
            );
            await conn.query(
                `DELETE s FROM Schedules s
                 JOIN Test_Records tr ON s.test_id = tr.test_id
                 WHERE tr.machine_id = ? AND tr.status = 'Draft' AND s.status IN ('Scheduled', 'Rescheduled', 'Locked')`,
                [machineId]
            );
            await conn.query(
                `UPDATE Test_Records SET reschedule_requested = 0, reschedule_reason = NULL
                 WHERE machine_id = ? AND status = 'Draft'`,
                [machineId]
            );
        }

        await conn.commit();
        return getMachineryById(machineId);
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};
