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
        res.status(200).json({ success: true, message: "Labourer removed." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error removing labourer.", error: error.message });
    }
=======
import * as LabourModel from '../models/labour.js';

export const listLabours = async (req, res, next) => {
    try {
        const labours = await LabourModel.getAllLabours();
        res.json({ success: true, labours });
    } catch (err) { next(err); }
};

export const createLabour = async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
        const newLabour = await LabourModel.createLabour(name);
        res.json({ success: true, labour: newLabour });
    } catch (err) { next(err); }
};

export const updateLabour = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, is_active } = req.body;
        await LabourModel.updateLabour(id, name, is_active);
        res.json({ success: true });
    } catch (err) { next(err); }
};

export const deleteLabour = async (req, res, next) => {
    try {
        const { id } = req.params;
        await LabourModel.deleteLabour(id);
        res.json({ success: true });
    } catch (err) { next(err); }
};

export const setLabourAvailability = async (req, res, next) => {
    try {
        const { labourId, date, isOnLeave, reason } = req.body;
        const result = await LabourModel.setLabourAvailability(labourId, date, isOnLeave, reason);
        res.json({ success: true, availability: result });
    } catch (err) { next(err); }
};

export const listLabourAvailability = async (req, res, next) => {
    try {
        const availability = await LabourModel.listLabourAvailability(req.query);
        res.json({ success: true, availability });
    } catch (err) { next(err); }
>>>>>>> 6fbbe5374139ecab1b933ca3bdcf9f0787ff6be5
};
