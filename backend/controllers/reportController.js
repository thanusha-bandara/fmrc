import path from "path";
import fs from "fs";
import { getAllReports, getReportById, getReportByTestId } from "../models/report.js";
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

        const filePath = path.join(REPORTS_DIR, report.pdf_file_path);
        if (!fs.existsSync(filePath)) {
            return res.status(410).json({ success: false, message: "The report PDF file is missing on the server." });
        }

        res.download(filePath, `${report.report_type}-${report.test_id}.pdf`);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error downloading report.", error: error.message });
    }
};
