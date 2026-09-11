import {
    createTestRecord,
    getTestRecordById,
    listTestRecords,
    saveTestFormData,
    submitTestRecord,
    reviewTestRecord,
    decideTestRecord,
    deleteTestRecord
} from "../models/testRecord.js";
import { generateMachineReport } from "../services/reportService.js";
import { estimateCompletion } from "../services/estimationService.js";

// Admin / Mechanical Engineer: register a new test request against a machine.
// This is what later feeds the Intelligent Scheduler (Chapter 3 of the report).
export const createTest = async (req, res) => {
    try {
        const { machine_id, test_name, is_field_test, requires_water, required_season, technical_assistant_id } = req.body;

        if (!machine_id || !test_name) {
            return res.status(400).json({ success: false, message: "machine_id and test_name are required." });
        }

        const test = await createTestRecord({
            machine_id, test_name, is_field_test, requires_water, required_season, technical_assistant_id
        });

        res.status(201).json({ success: true, message: "Test request created successfully.", test });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error creating test request.", error: error.message });
    }
};

// Lists tests, scoped by role and optional query filters so the same endpoint can
// drive each dashboard: ?status=Submitted, ?mine=true (TA's assigned tests), etc.
export const getTests = async (req, res) => {
    try {
        const { status, machineId } = req.query;
        const filters = { status, machineId };

        // A Technical Assistant only sees tests scheduled to them, unless they explicitly
        // ask for a specific status view (e.g. reviewing what they've already submitted).
        if (req.user.role === "Technical_Assistant" && req.query.mine === "true") {
            filters.assignedTaId = req.user.user_id;
        }

        const tests = await listTestRecords(filters);
        res.status(200).json({ success: true, tests });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching tests.", error: error.message });
    }
};

export const getTest = async (req, res) => {
    try {
        const test = await getTestRecordById(req.params.id);
        if (!test) {
            return res.status(404).json({ success: false, message: "Test record not found." });
        }
        res.status(200).json({ success: true, test });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching test record.", error: error.message });
    }
};

// Technical Assistant: save field data captured via the PWA. Can be called repeatedly
// while the record is still in Draft (supports the offline/background-sync workflow).
export const saveTestData = async (req, res) => {
    try {
        const { formData } = req.body;
        if (!formData || typeof formData !== "object") {
            return res.status(400).json({ success: false, message: "formData object is required." });
        }

        const existing = await getTestRecordById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Test record not found." });
        }
        if (existing.status !== "Draft") {
            return res.status(409).json({ success: false, message: `Cannot edit data once the test is ${existing.status}.` });
        }

        const test = await saveTestFormData(req.params.id, formData);
        res.status(200).json({ success: true, message: "Test data saved.", test });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error saving test data.", error: error.message });
    }
};

// Technical Assistant: finalize data entry and submit for Mechanical Engineer review.
export const submitTest = async (req, res) => {
    try {
        const existing = await getTestRecordById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Test record not found." });
        }
        if (existing.status !== "Draft") {
            return res.status(409).json({ success: false, message: `Test is already ${existing.status}.` });
        }
        if (!existing.form_data) {
            return res.status(400).json({ success: false, message: "Cannot submit a test with no recorded data." });
        }

        const test = await submitTestRecord(req.params.id);
        res.status(200).json({ success: true, message: "Test submitted for Mechanical Engineer review.", test });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error submitting test.", error: error.message });
    }
};

// Mechanical Engineer: review submitted data and recommend / not-recommend it.
// Either outcome moves the record forward to the Chief Engineer, per the activity diagram.
export const reviewTest = async (req, res) => {
    try {
        const { recommendation, comments } = req.body;
        const allowed = ["Recommended", "Not Recommended"];
        if (!allowed.includes(recommendation)) {
            return res.status(400).json({ success: false, message: `recommendation must be one of: ${allowed.join(", ")}` });
        }

        const existing = await getTestRecordById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Test record not found." });
        }
        if (existing.status !== "Submitted") {
            return res.status(409).json({ success: false, message: `Test must be Submitted before review (currently ${existing.status}).` });
        }

        const test = await reviewTestRecord(req.params.id, req.user.user_id, recommendation, comments);
        res.status(200).json({ success: true, message: `Test marked as ${recommendation}.`, test });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error reviewing test.", error: error.message });
    }
};

// Chief Engineer: final decision. Approval automatically generates the official PDF report.
export const decideTest = async (req, res) => {
    try {
        const { decision, comments } = req.body;
        const allowed = ["Approved", "Rejected"];
        if (!allowed.includes(decision)) {
            return res.status(400).json({ success: false, message: `decision must be one of: ${allowed.join(", ")}` });
        }

        const existing = await getTestRecordById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Test record not found." });
        }
        if (existing.status !== "Reviewed") {
            return res.status(409).json({ success: false, message: `Test must be Reviewed by a Mechanical Engineer first (currently ${existing.status}).` });
        }
        // 4-Wheel Tractor tests no longer get individual CE decisions -- the Chief Engineer
        // approves/rejects the ME-finalized compiled report as a whole instead (see
        // finalReportController.js / reportController.js#decideReport).
        if (existing.catalog_key === "FOUR_WHEEL_TRACTOR") {
            return res.status(409).json({ success: false, message: "This test is part of a 4-Wheel Tractor final report. Once a Mechanical Engineer finalizes the report, approve or reject it from Reports for Approval instead of deciding on individual tests." });
        }

        const test = await decideTestRecord(req.params.id, req.user.user_id, decision, comments);

        let report = null;
        let message = decision === "Approved" ? "Test approved." : "Test rejected.";

        // After ANY decision (Approved or Rejected), check if all tests for this machine are complete
        const allTestsForMachine = await listTestRecords({ machineId: existing.machine_id });
        const pendingTests = allTestsForMachine.filter(t => !['Approved', 'Rejected'].includes(t.status));

        if (pendingTests.length === 0) {
            // All tests are complete -- generate the generic report dump (the 4-Wheel Tractor's
            // official template is generated earlier, by the ME's Finalize Report action, not
            // here). Kept in its own try/catch so a report-generation problem never fails the
            // CE's otherwise-valid individual decision.
            try {
                report = await generateMachineReport(existing.machine_id, req.user.user_id);
                message = `Test ${decision.toLowerCase()}. All tests for this machine are now complete, and the final certification report has been generated!`;
            } catch (reportError) {
                message = `Test ${decision.toLowerCase()}. All tests are complete, but the final report could not be generated yet: ${reportError.message}`;
            }
        } else {
            message = `Test ${decision.toLowerCase()}. There are still ${pendingTests.length} tests pending for this machine before the final report can be generated.`;
        }

        res.status(200).json({
            success: true,
            message,
            test,
            report
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deciding on test.", error: error.message });
    }
};

// Admin: remove a test request that hasn't progressed (e.g. created by mistake).
export const removeTest = async (req, res) => {
    try {
        const existing = await getTestRecordById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Test record not found." });
        }
        if (existing.status !== "Draft") {
            return res.status(409).json({ success: false, message: "Only Draft tests can be deleted." });
        }
        await deleteTestRecord(req.params.id);
        res.status(200).json({ success: true, message: "Test request deleted." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting test.", error: error.message });
    }
};

// Rule-Based Predictive Estimation: how long until this test's report is expected.
export const getEstimate = async (req, res) => {
    try {
        const existing = await getTestRecordById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Test record not found." });
        }
        const estimate = await estimateCompletion(existing.test_name, Boolean(existing.is_field_test));
        res.status(200).json({ success: true, estimate });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error calculating estimate.", error: error.message });
    }
};
