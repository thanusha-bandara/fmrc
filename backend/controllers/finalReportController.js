import { getFinalizeStatusForMachine, applyFinalReportSelections } from "../models/testRecord.js";
import { getMachineryById } from "../models/machinery.js";
import { generateOfficialTractorReport } from "../services/officialTractorReportService.js";
import { generateOfficialHarvesterReport } from "../services/officialHarvesterReportService.js";

// Mechanical Engineer: readiness check for a machine's Finalize Report screen -- whether every
// test has been reviewed yet, and the replicate groups (one chosen replicate per group).
export const getFinalizeStatus = async (req, res) => {
    try {
        const status = await getFinalizeStatusForMachine(req.params.id);
        res.status(200).json({ success: true, status });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching finalize status.", error: error.message });
    }
};

// Mechanical Engineer: submits the chosen replicates (one per implement/field test group), then immediately
// generates the official report (pending Chief Engineer approval -- see reportController.js).
export const finalizeReport = async (req, res) => {
    try {
        const machineId = req.params.id;
        const { selections } = req.body || {};
        if (!selections || typeof selections !== "object" || Array.isArray(selections)) {
            return res.status(400).json({ success: false, message: "selections must be an object of { group_key: test_id }." });
        }

        const machine = await getMachineryById(machineId);
        if (machine && machine.is_on_hold) {
            return res.status(409).json({ success: false, message: "This machine is currently On Hold and cannot be finalized." });
        }

        const status = await getFinalizeStatusForMachine(machineId);
        if (status.groups.length === 0) {
            return res.status(400).json({ success: false, message: "Final report template is not available for this machine yet." });
        }
        if (!status.ready) {
            return res.status(409).json({ success: false, message: `${status.notReviewedCount} test(s) still need to be reviewed by a Mechanical Engineer before finalizing.` });
        }

        const machineGroupKeys = status.groups.map((g) => g.group_key);
        const selectedGroupKeys = Object.keys(selections);
        const missingGroups = machineGroupKeys.filter((g) => !selectedGroupKeys.includes(g));
        if (missingGroups.length > 0) {
            return res.status(400).json({ success: false, message: `Missing a selection for: ${missingGroups.join(", ")}.` });
        }

        for (const group of status.groups) {
            const testId = Number(selections[group.group_key]);
            const belongs = group.tests.some((t) => t.test_id === testId);
            if (!belongs) {
                return res.status(400).json({ success: false, message: `Test ${selections[group.group_key]} does not belong to group ${group.group_key} on this machine.` });
            }
        }

        await applyFinalReportSelections(machineId, selections);

        const allMachineTests = [...status.singular, ...status.groups.flatMap((g) => g.tests)];
        const isCombineHarvester = allMachineTests.some((t) => t.catalog_key === "COMBINE_HARVESTER");

        const report = isCombineHarvester
            ? await generateOfficialHarvesterReport(machineId)
            : await generateOfficialTractorReport(machineId);

        res.status(201).json({ success: true, message: "Final report generated and sent for Chief Engineer approval.", report });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error finalizing report.", error: error.message });
    }
};
