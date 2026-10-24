import express from "express";
import { listReports, getReport, getReportForTest, downloadReport, listPendingReports, decideReport } from "../controllers/reportController.js";
import { authenticate, authorize } from "../middlware/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/", authorize("Chief_Engineer"), listReports);
router.get("/pending", authorize("Chief_Engineer"), listPendingReports);
router.get("/test/:testId", authorize("Chief_Engineer"), getReportForTest);
router.get("/:id", authorize("Chief_Engineer"), getReport);
router.get("/:id/download", authorize("Chief_Engineer"), downloadReport);
router.post("/:id/decide", authorize("Chief_Engineer"), decideReport);

export default router;
