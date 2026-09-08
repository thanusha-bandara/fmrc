import express from "express";
import { getStandaloneEstimate } from "../controllers/estimationController.js";
import { authenticate } from "../middlware/auth.js";

const router = express.Router();

router.get("/", authenticate, getStandaloneEstimate);

export default router;
