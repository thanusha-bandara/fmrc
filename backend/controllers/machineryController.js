import {
    createMachinery,
    getAllMachinery,
    getMachineryById,
    updateMachinery,
    deleteMachinery
} from "../models/machinery.js";

// Admin-only: register a new agricultural machine into the central database.
export const registerMachine = async (req, res) => {
    try {
        const { machine_name, model, supplier, registration_date } = req.body;

        if (!machine_name || !registration_date) {
            return res.status(400).json({ success: false, message: "machine_name and registration_date are required." });
        }

        const machine = await createMachinery({ machine_name, model, supplier, registration_date });
        res.status(201).json({ success: true, message: "Machine registered successfully.", machine });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error registering machine.", error: error.message });
    }
};

export const listMachines = async (req, res) => {
    try {
        const machines = await getAllMachinery();
        res.status(200).json({ success: true, machines });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching machinery.", error: error.message });
    }
};

export const getMachine = async (req, res) => {
    try {
        const machine = await getMachineryById(req.params.id);
        if (!machine) {
            return res.status(404).json({ success: false, message: "Machine not found." });
        }
        res.status(200).json({ success: true, machine });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching machine.", error: error.message });
    }
};

export const editMachine = async (req, res) => {
    try {
        const existing = await getMachineryById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Machine not found." });
        }
        const machine = await updateMachinery(req.params.id, req.body);
        res.status(200).json({ success: true, message: "Machine updated successfully.", machine });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating machine.", error: error.message });
    }
};

export const removeMachine = async (req, res) => {
    try {
        const deleted = await deleteMachinery(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Machine not found." });
        }
        res.status(200).json({ success: true, message: "Machine deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting machine.", error: error.message });
    }
};
