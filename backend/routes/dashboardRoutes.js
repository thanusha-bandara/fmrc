import express from "express";
import { getDashboardSummary } from "../controllers/dashboardController.js";
import { authenticate } from "../middlware/auth.js";

const router = express.Router();

router.get("/summary", authenticate, getDashboardSummary);

export default router;
