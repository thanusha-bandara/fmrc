import path from "path";
import fs from "fs";
import { getAllReports, getReportById, getReportByTestId, getPendingReports, updateReportDecision, updateReportPdfPath } from "../models/report.js";
import { approveAllTestsForMachine } from "../models/testRecord.js";
import { REPORTS_DIR, buildMachineReportPdf } from "../services/reportService.js";
import { buildOfficialTractorReportPdf } from "../services/officialTractorReportService.js";

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
    // Never let a browser or service worker cache this response, success or error -- the file
    // behind this same URL can be regenerated (see the self-heal below) without the URL changing.
    res.set("Cache-Control", "no-store");
    try {
        const report = await getReportById(req.params.id);
        if (!report) {
            return res.status(404).json({ success: false, message: "Report not found." });
        }

        // A report pending Chief Engineer approval can only be previewed by the Chief
        // Engineer (before deciding) or an Admin -- everyone else waits for approval.
        const requesterRole = req.user?.role;
        const isPrivileged = requesterRole === "Chief_Engineer" || requesterRole === "Admin";
        if (report.ce_status === "Pending" && !isPrivileged) {
            return res.status(403).json({ success: false, message: "This report is pending Chief Engineer approval." });
        }

        let filePath = path.join(REPORTS_DIR, report.pdf_file_path);

        // The underlying test/machine data that produced this PDF still lives in the database
        // even if the rendered file itself went missing from disk (moved, cleaned up, lost to
        // sync/antivirus, etc.) -- so re-render it on the fly instead of just failing, without
        // touching the report's existing CE approval/decision fields.
        if (!fs.existsSync(filePath) && report.machine_id) {
            try {
                const newFileName = report.report_type === "Official Tractor Certification Report"
                    ? await buildOfficialTractorReportPdf(report.machine_id)
                    : (await buildMachineReportPdf(report.machine_id)).fileName;
                await updateReportPdfPath(report.report_id, newFileName);
                filePath = path.join(REPORTS_DIR, newFileName);
            } catch (regenError) {
                return res.status(410).json({ success: false, message: `The report PDF file is missing on the server and could not be regenerated: ${regenError.message}` });
            }
        }

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

        // Approving the compiled report is the only "decision" tractor tests get under this
        // flow (see testController.js#decideTest's FOUR_WHEEL_TRACTOR guard) -- cascade it down
        // so every underlying test also shows Approved, instead of staying Reviewed forever.
        if (decision === "Approved" && report.machine_id) {
            await approveAllTestsForMachine(report.machine_id, req.user.user_id);
        }

        res.status(200).json({ success: true, message: `Report marked as ${decision}.`, report });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deciding on report.", error: error.message });
    }
};
