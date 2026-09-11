import db from '../config/db.js';

export const createMachinery = async ({ machine_name, model, supplier, registration_date }) => {
    const [result] = await db.query(
        `INSERT INTO Machinery (machine_name, model, supplier, registration_date) VALUES (?, ?, ?, ?)`,
        [machine_name, model || null, supplier || null, registration_date]
    );
    return getMachineryById(result.insertId);
};

export const getAllMachinery = async () => {
    const [rows] = await db.query(`
        SELECT
            m.*,
            COUNT(tr.test_id) AS total_tests,
            SUM(CASE WHEN tr.status = 'Approved' THEN 1 ELSE 0 END) AS approved_tests,
            (SELECT COUNT(*) FROM Reports r WHERE r.machine_id = m.machine_id AND r.ce_status = 'Approved') AS has_approved_report
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
    rops_available, safety_note, background_note
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
            background_note = COALESCE(?, background_note)
         WHERE machine_id = ?`,
        [
            machine_name ?? null, model ?? null, supplier ?? null, registration_date ?? null,
            document_ref_number ?? null, manufacturer_country ?? null,
            importer_name ?? null, importer_address ?? null, importer_tel ?? null, importer_fax ?? null, importer_web ?? null,
            rops_available ?? null, safety_note ?? null, background_note ?? null,
            machineId
        ]
    );
    return getMachineryById(machineId);
};

export const deleteMachinery = async (machineId) => {
    const [result] = await db.query(`DELETE FROM Machinery WHERE machine_id = ?`, [machineId]);
    return result.affectedRows > 0;
};
