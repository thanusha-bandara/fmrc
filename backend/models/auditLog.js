import db from '../config/db.js';

// Records who changed what and when in Resource Management, for accountability.
// This is a DB-only audit trail -- it is never surfaced in the UI. A logging
// failure must never break the actual write it's recording, so callers should
// not await this in a way that fails their own request.
export const logResourceAudit = async (req, action, details) => {
    try {
        const userId = req.user?.user_id;
        const fullName = req.user?.full_name || 'Unknown';
        if (!userId) return;
        await db.query(
            `INSERT INTO Resource_Audit_Log (user_id, full_name, action, details) VALUES (?, ?, ?, ?)`,
            [userId, fullName, action, details ? JSON.stringify(details) : null]
        );
    } catch (error) {
        console.error('Failed to write resource audit log:', error.message);
    }
};
