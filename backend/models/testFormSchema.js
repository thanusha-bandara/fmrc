import db from '../config/db.js';

const parseSections = (schemaJson) =>
    typeof schemaJson === 'string' ? JSON.parse(schemaJson) : schemaJson;

const toSchema = (row) => ({
    schema_id: row.schema_id,
    schema_key: row.schema_key,
    label: row.label,
    formula_set: row.formula_set,
    sections: parseSections(row.schema_json)
});

export const getSchemaById = async (schemaId) => {
    const [rows] = await db.query(
        `SELECT schema_id, schema_key, label, formula_set, schema_json FROM Test_Form_Schemas WHERE schema_id = ?`,
        [schemaId]
    );
    return rows[0] ? toSchema(rows[0]) : null;
};

// Batched lookup for the report generator, which needs the schemas for whatever distinct
// schema_ids appear across a machine's tests (typically <=5), not one query per test.
export const getSchemasByIds = async (schemaIds) => {
    if (!schemaIds || schemaIds.length === 0) return {};
    const [rows] = await db.query(
        `SELECT schema_id, schema_key, label, formula_set, schema_json FROM Test_Form_Schemas WHERE schema_id IN (?)`,
        [schemaIds]
    );
    const map = {};
    rows.forEach((row) => { map[row.schema_id] = toSchema(row); });
    return map;
};

export const getSchemaIdsByKey = async () => {
    const [rows] = await db.query(`SELECT schema_id, schema_key FROM Test_Form_Schemas`);
    const map = {};
    rows.forEach((row) => { map[row.schema_key] = row.schema_id; });
    return map;
};
