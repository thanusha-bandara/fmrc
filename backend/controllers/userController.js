import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import {
    findUserByUsernameOrEmail,
    findUserById,
    createUser,
    getAllUsers,
    updateUser,
    updateUserPassword,
    deleteUser,
    getUsersByRole,
    hasPendingResetRequest,
    createResetRequest,
    listPendingResetRequests,
    completeResetRequests
} from "../models/user.js";

const SALT_ROUNDS = 10;

// Requires exactly 8 characters, with one uppercase letter, one lowercase letter, one number,
// and one special character.
const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8}$/;
const PASSWORD_REQUIREMENTS_MESSAGE =
    "Password must be exactly 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.";

const signToken = (user) => {
    return jwt.sign(
        { user_id: user.user_id, role: user.role, full_name: user.full_name },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );
};

export const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: "Username and password are required." });
        }

        const user = await findUserByUsernameOrEmail(username);
        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid username or password." });
        }

        if (!user.is_active) {
            return res.status(403).json({ success: false, message: "This account has been deactivated. Contact the System Administrator." });
        }

        const passwordMatches = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatches) {
            return res.status(401).json({ success: false, message: "Invalid username or password." });
        }

        const token = signToken(user);

        res.status(200).json({
            success: true,
            message: "Login successful.",
            token,
            user: {
                user_id: user.user_id,
                full_name: user.full_name,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error logging in.", error: error.message });
    }
};

// Public: a user who forgot their password asks the administrator to set a new one.
export const requestPasswordReset = async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ success: false, message: "Username is required." });
        }

        const user = await findUserByUsernameOrEmail(username);
        if (!user) {
            return res.status(404).json({ success: false, message: "No account found with that username." });
        }
        if (!user.is_active) {
            return res.status(403).json({ success: false, message: "This account has been deactivated. Contact the System Administrator." });
        }

        if (!(await hasPendingResetRequest(user.user_id))) {
            await createResetRequest(user.user_id, user.username);
        }

        res.status(200).json({ success: true, message: "Your request has been sent to the administrator." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error sending password reset request.", error: error.message });
    }
};

// Admin-only: list users waiting for a password reset.
export const listPasswordResetRequests = async (req, res) => {
    try {
        const requests = await listPendingResetRequests();
        res.status(200).json({ success: true, requests });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching password reset requests.", error: error.message });
    }
};

// Admin-only: set a new password for a user and close their pending reset requests.
export const setUserPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword) {
            return res.status(400).json({ success: false, message: "newPassword is required." });
        }
        if (!STRONG_PASSWORD_PATTERN.test(newPassword)) {
            return res.status(400).json({ success: false, message: PASSWORD_REQUIREMENTS_MESSAGE });
        }

        const user = await findUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await updateUserPassword(user.user_id, password_hash);
        await completeResetRequests(user.user_id);

        res.status(200).json({ success: true, message: "Password updated successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error setting password.", error: error.message });
    }
};

// Admin-only: onboard a new Technical Assistant / Mechanical Engineer / Chief Engineer / Admin.
export const registerUser = async (req, res) => {
    try {
        const { full_name, username, email, password, phone, role } = req.body;
        const allowedRoles = ["Admin", "Technical_Assistant", "Mechanical_Engineer", "Chief_Engineer"];

        if (!full_name || !username || !email || !password || !role) {
            return res.status(400).json({ success: false, message: "full_name, username, email, password and role are required." });
        }

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ success: false, message: `role must be one of: ${allowedRoles.join(", ")}` });
        }

        if (!STRONG_PASSWORD_PATTERN.test(password)) {
            return res.status(400).json({ success: false, message: PASSWORD_REQUIREMENTS_MESSAGE });
        }

        const existing = await findUserByUsernameOrEmail(username) || await findUserByUsernameOrEmail(email);
        if (existing) {
            return res.status(409).json({ success: false, message: "User already exists in the system." });
        }

        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await createUser({ full_name, username, email, password_hash, phone, role });

        res.status(201).json({ success: true, message: "User registered successfully.", user });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ success: false, message: "User already exists in the system." });
        }
        res.status(500).json({ success: false, message: "Error registering user.", error: error.message });
    }
};

// Any authenticated user may look up users by role (e.g. picking a Technical Assistant
// in a resource-management form). Only Admins may pull the full, unfiltered directory.
export const listUsers = async (req, res) => {
    try {
        const { role } = req.query;

        if (!role && req.user.role !== "Admin") {
            return res.status(403).json({ success: false, message: "You do not have permission to perform this action." });
        }

        const users = role ? await getUsersByRole(role) : await getAllUsers();
        res.status(200).json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching users.", error: error.message });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await findUserById(req.user.user_id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching profile.", error: error.message });
    }
};

export const getUser = async (req, res) => {
    try {
        const user = await findUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching user.", error: error.message });
    }
};

// Admin-only: update another user's profile, role, or active status.
export const editUser = async (req, res) => {
    try {
        const { full_name, email, phone, role, is_active } = req.body;
        const user = await findUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        const updated = await updateUser(req.params.id, { full_name, email, phone, role, is_active });
        res.status(200).json({ success: true, message: "User updated successfully.", user: updated });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ success: false, message: "Email already in use by another account." });
        }
        res.status(500).json({ success: false, message: "Error updating user.", error: error.message });
    }
};

// Any authenticated user updating their own name/phone.
export const updateMyProfile = async (req, res) => {
    try {
        const { full_name, phone } = req.body;
        const updated = await updateUser(req.user.user_id, { full_name, phone });
        res.status(200).json({ success: true, message: "Profile updated successfully.", user: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating profile.", error: error.message });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "currentPassword and newPassword are required." });
        }
        if (!STRONG_PASSWORD_PATTERN.test(newPassword)) {
            return res.status(400).json({ success: false, message: PASSWORD_REQUIREMENTS_MESSAGE });
        }

        const [rawUser] = await db.query(
            `SELECT password_hash FROM Users WHERE user_id = ?`, [req.user.user_id]
        );
        if (rawUser.length === 0) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const matches = await bcrypt.compare(currentPassword, rawUser[0].password_hash);
        if (!matches) {
            return res.status(401).json({ success: false, message: "Current password is incorrect." });
        }

        const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await updateUserPassword(req.user.user_id, password_hash);

        res.status(200).json({ success: true, message: "Password changed successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error changing password.", error: error.message });
    }
};

// Admin-only: deactivate (soft) rather than hard-delete, to preserve historical test/report records.
export const deactivateUser = async (req, res) => {
    try {
        const user = await findUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        const updated = await updateUser(req.params.id, { is_active: false });
        res.status(200).json({ success: true, message: "User deactivated successfully.", user: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deactivating user.", error: error.message });
    }
};

export const removeUser = async (req, res) => {
    try {
        const deleted = await deleteUser(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        res.status(200).json({ success: true, message: "User deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting user.", error: error.message });
    }
};
