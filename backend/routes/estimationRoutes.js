import express from "express";
import {
    getActiveEstimations,
    getSingleMachineEstimation,
    calculateCustomEstimation
} from "../controllers/estimationController.js";
import { authenticate } from "../middlware/auth.js";

const router = express.Router();

router.get("/", authenticate, getActiveEstimations);
router.get("/machine/:id", authenticate, getSingleMachineEstimation);
router.post("/calculate", authenticate, calculateCustomEstimation);

export default router;
