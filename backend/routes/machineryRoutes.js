import express from "express";
import {
    registerMachine,
    listMachines,
    getMachine,
    editMachine,
    removeMachine
} from "../controllers/machineryController.js";
import { authenticate, authorize } from "../middlware/auth.js";

const router = express.Router();

router.get("/", authenticate, listMachines);
router.get("/:id", authenticate, getMachine);
router.post("/", authenticate, authorize("Admin"), registerMachine);
router.put("/:id", authenticate, authorize("Admin"), editMachine);
router.delete("/:id", authenticate, authorize("Admin"), removeMachine);

export default router;
