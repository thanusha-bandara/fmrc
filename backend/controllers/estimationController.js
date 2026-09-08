import { estimateCompletion } from "../services/estimationService.js";

// Standalone estimate for a proposed test (no Test_Records row needed yet),
// e.g. GET /api/estimate?testName=4-Wheel Tractor Test&isFieldTest=true
export const getStandaloneEstimate = async (req, res) => {
    try {
        const { testName, isFieldTest } = req.query;
        if (!testName) {
            return res.status(400).json({ success: false, message: "testName query parameter is required." });
        }
        const estimate = await estimateCompletion(testName, isFieldTest !== "false");
        res.status(200).json({ success: true, estimate });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error calculating estimate.", error: error.message });
    }
};
