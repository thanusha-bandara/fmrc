import { bulkCreateStandardTestRecords } from "../models/testRecord.js";
import { CATALOG_LABELS } from "../config/standardTestCatalog.js";

// Lists the available standard test catalogs (machine types) for the frontend picker.
export const getCatalogs = async (req, res) => {
    try {
        res.status(200).json({ success: true, catalogs: CATALOG_LABELS });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching catalogs.", error: error.message });
    }
};

// Admin / Mechanical Engineer: bulk-create the standard test set for a machine, for a given
// machine-type catalog (e.g. "FOUR_WHEEL_TRACTOR", "COMBINE_HARVESTER").
export const generateStandardTestSet = async (req, res) => {
    try {
        const { machine_id, catalog_key } = req.body;
        if (!machine_id || !catalog_key) {
            return res.status(400).json({ success: false, message: "machine_id and catalog_key are required." });
        }

        const tests = await bulkCreateStandardTestRecords(machine_id, catalog_key);
        res.status(201).json({ success: true, message: "Standard test set created.", tests });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error generating standard test set.", error: error.message });
    }
};
