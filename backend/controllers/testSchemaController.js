import { getTestRecordById } from "../models/testRecord.js";
import { getSchemaById } from "../models/testFormSchema.js";

// Returns the structured form schema for a given test, resolved via its schema_id (set at
// creation time -- see bulkCreateStandardTestRecords). Legacy/free-form tests have no
// schema_id and get a 404, which the frontend uses to fall back to the KeyValueEditor.
export const getTestSchema = async (req, res) => {
    try {
        const test = await getTestRecordById(req.params.testId);
        if (!test || !test.schema_id) {
            return res.status(404).json({ success: false, message: "No structured schema for this test." });
        }

        const schema = await getSchemaById(test.schema_id);
        if (!schema) {
            return res.status(404).json({ success: false, message: "Schema not found." });
        }

        res.status(200).json({ success: true, schema });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching test schema.", error: error.message });
    }
};
