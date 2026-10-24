import path from "path";
import fs from "fs";
import { getAllReports, getReportById, getReportByTestId, getPendingReports, updateReportDecision } from "../models/report.js";
import { approveAllTestsForMachine } from "../models/testRecord.js";
import { REPORTS_DIR } from "../services/reportService.js";

export const listReports = async (req, res) => {
    try {
        const reports = await getAllReports();
        res.status(200).json({ success: true, reports });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching reports.", error: error.message });
    }
};

export const getReport = async (req, res) => {
    try {
        const report = await getReportById(req.params.id);
        if (!report) {
            return res.status(404).json({ success: false, message: "Report not found." });
        }
        res.status(200).json({ success: true, report });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching report.", error: error.message });
    }
};

export const getReportForTest = async (req, res) => {
    try {
        const report = await getReportByTestId(req.params.testId);
        if (!report) {
            return res.status(404).json({ success: false, message: "No report has been generated for this test yet." });
        }
        res.status(200).json({ success: true, report });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching report.", error: error.message });
    }
};

export const downloadReport = async (req, res) => {
    try {
        const report = await getReportById(req.params.id);
        if (!report) {
            return res.status(404).json({ success: false, message: "Report not found." });
        }

        // A report pending Chief Engineer approval can only be previewed by the Chief Engineer.
        const requesterRole = req.user?.role;
        const isPrivileged = requesterRole === "Chief_Engineer";
        if (report.ce_status === "Pending" && !isPrivileged) {
            return res.status(403).json({ success: false, message: "This report is pending Chief Engineer approval." });
        }

        const filePath = path.join(REPORTS_DIR, report.pdf_file_path);
        if (!fs.existsSync(filePath)) {
            return res.status(410).json({ success: false, message: "The report PDF file is missing on the server." });
        }

        res.download(filePath, `${report.report_type}-${report.test_id || report.machine_id}.pdf`);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error downloading report.", error: error.message });
    }
};

// Chief Engineer / Admin: the queue of ME-finalized reports awaiting a single Approve/Reject
// decision on the compiled report (not on each of its underlying tests).
export const listPendingReports = async (req, res) => {
    try {
        const reports = await getPendingReports();
        res.status(200).json({ success: true, reports });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching pending reports.", error: error.message });
    }
};

// Chief Engineer: approve or reject a compiled final report as a whole.
export const decideReport = async (req, res) => {
    try {
        const { decision, comments } = req.body;
        const allowed = ["Approved", "Rejected"];
        if (!allowed.includes(decision)) {
            return res.status(400).json({ success: false, message: `decision must be one of: ${allowed.join(", ")}` });
        }

        const existing = await getReportById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Report not found." });
        }
        if (existing.ce_status !== "Pending") {
            return res.status(409).json({ success: false, message: `This report has already been ${existing.ce_status.toLowerCase()}.` });
        }

        const report = await updateReportDecision(req.params.id, req.user.user_id, decision, comments);

        // Cascade Chief Engineer's report decision (Approved or Rejected) down to every underlying
        // test for this machine so Approved reports move tests to Completed Tests and Rejected
        // reports move tests to Rejected Tests.
        if (report.machine_id) {
            await approveAllTestsForMachine(report.machine_id, req.user.user_id, decision, comments);
        }

        res.status(200).json({ success: true, message: `Report marked as ${decision}.`, report });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deciding on report.", error: error.message });
    }
};
