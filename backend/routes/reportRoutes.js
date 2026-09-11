import express from "express";
import { listReports, getReport, getReportForTest, downloadReport, listPendingReports, decideReport } from "../controllers/reportController.js";
import { authenticate, authorize } from "../middlware/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/", listReports);
router.get("/pending", authorize("Chief_Engineer", "Admin"), listPendingReports);
router.get("/test/:testId", getReportForTest);
router.get("/:id", getReport);
router.get("/:id/download", downloadReport);
router.post("/:id/decide", authorize("Chief_Engineer"), decideReport);

export default router;
