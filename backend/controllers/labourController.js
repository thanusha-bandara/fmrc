import {
    getAllLabours,
    findLabourById,
    createLabour,
    updateLabour,
    deleteLabour
} from "../models/labour.js";

export const listLabours = async (req, res) => {
    try {
        const labours = await getAllLabours();
        res.status(200).json({ success: true, labours });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching labourers.", error: error.message });
    }
};

// Admin-only: add a labourer to the roster. Labourers have no login — just a name to track availability against.
export const addLabour = async (req, res) => {
    try {
        const { full_name, phone } = req.body;
        if (!full_name) {
            return res.status(400).json({ success: false, message: "full_name is required." });
        }
        const labour = await createLabour({ full_name, phone });
        res.status(201).json({ success: true, message: "Labourer added.", labour });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error adding labourer.", error: error.message });
    }
};

export const editLabour = async (req, res) => {
    try {
        const existing = await findLabourById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Labourer not found." });
        }
        const labour = await updateLabour(req.params.id, req.body);
        res.status(200).json({ success: true, message: "Labourer updated.", labour });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating labourer.", error: error.message });
    }
};

export const deactivateLabour = async (req, res) => {
    try {
        const existing = await findLabourById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Labourer not found." });
        }
        const labour = await updateLabour(req.params.id, { is_active: false });
        res.status(200).json({ success: true, message: "Labourer deactivated.", labour });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deactivating labourer.", error: error.message });
    }
};

export const removeLabour = async (req, res) => {
    try {
        const deleted = await deleteLabour(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Labourer not found." });
        }
        res.status(200).json({ success: true, message: "Labourer removed." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error removing labourer.", error: error.message });
    }
};
