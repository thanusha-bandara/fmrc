import express from "express";
import { listReports, getReport, getReportForTest, downloadReport } from "../controllers/reportController.js";
import { authenticate } from "../middlware/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/", listReports);
router.get("/test/:testId", getReportForTest);
router.get("/:id", getReport);
router.get("/:id/download", downloadReport);

export default router;
