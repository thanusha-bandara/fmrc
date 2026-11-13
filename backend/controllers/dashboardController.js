import db from "../config/db.js";
import { getDashboardEstimations } from "../services/predictiveEstimationService.js";

// Returns a role-scoped summary used to populate each dashboard (Table 1 of the report:
// TA -> assigned/pending entry, ME -> pending review, CE -> pending approval, Admin -> everything).
export const getDashboardSummary = async (req, res) => {
    try {
        const { role, user_id } = req.user;
        const summary = {};

        const [[{ total_machines }]] = await db.query(`SELECT COUNT(*) AS total_machines FROM Machinery`);
        summary.totalMachines = total_machines;

        const [[{ total_tests }]] = await db.query(`SELECT COUNT(*) AS total_tests FROM Test_Records`);
        summary.totalTests = total_tests;

        const [statusCounts] = await db.query(`
            SELECT status, COUNT(*) AS count FROM Test_Records GROUP BY status
        `);
        summary.testsByStatus = statusCounts.reduce((acc, row) => {
            acc[row.status] = row.count;
            return acc;
        }, {});

        const [[{ upcoming }]] = await db.query(`
            SELECT COUNT(*) AS upcoming FROM Schedules
            WHERE status IN ('Scheduled', 'Rescheduled') AND scheduled_date >= CURDATE()
        `);
        summary.upcomingSchedules = upcoming;

        const [[{ reports_issued }]] = await db.query(`SELECT COUNT(*) AS reports_issued FROM Reports`);
        summary.reportsIssued = reports_issued;

        if (role === "Technical_Assistant") {
            const [[{ my_assigned }]] = await db.query(`
                SELECT COUNT(DISTINCT s.test_id) AS my_assigned
                FROM Schedules s
                WHERE s.assigned_ta_id = ? AND s.status IN ('Scheduled', 'Rescheduled')
            `, [user_id]);
            const [[{ my_drafts }]] = await db.query(`
                SELECT COUNT(*) AS my_drafts FROM Test_Records WHERE technical_assistant_id = ? AND status = 'Draft'
            `, [user_id]);
            summary.myAssignedTests = my_assigned;
            summary.myDraftTests = my_drafts;
        }

        if (role === "Mechanical_Engineer") {
            const [[{ pending_review }]] = await db.query(`
                SELECT COUNT(*) AS pending_review FROM Test_Records WHERE status = 'Submitted'
            `);
            summary.pendingReview = pending_review;
        }

        if (role === "Chief_Engineer") {
            const [[{ pending_approval }]] = await db.query(`
                SELECT COUNT(*) AS pending_approval FROM Test_Records WHERE status = 'Reviewed'
            `);
            summary.pendingApproval = pending_approval;
        }

        if (role === "Admin") {
            const [[{ active_users }]] = await db.query(`SELECT COUNT(*) AS active_users FROM Users WHERE is_active = TRUE`);
            summary.activeUsers = active_users;
        }

        try {
            summary.predictiveEstimations = await getDashboardEstimations(6);
        } catch (estErr) {
            console.warn("Could not attach predictive estimations to dashboard summary:", estErr.message);
            summary.predictiveEstimations = [];
        }

        res.status(200).json({ success: true, summary });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error building dashboard summary.", error: error.message });
    }
};
