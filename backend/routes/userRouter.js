import express from "express";
import {
    login,
    registerUser,
    listUsers,
    getMe,
    getUser,
    editUser,
    updateMyProfile,
    changePassword,
    deactivateUser,
    removeUser
} from "../controllers/userController.js";
import { authenticate, authorize } from "../middlware/auth.js";

const router = express.Router();

// Public
router.post("/login", login);

// Authenticated (any role)
router.get("/me", authenticate, getMe);
router.put("/me", authenticate, updateMyProfile);
router.put("/me/password", authenticate, changePassword);

// Listing by role (e.g. ?role=Technical_Assistant) is needed by non-admins too, for
// resource-management pickers (assigning leave, etc.) — enforced inside the controller.
router.get("/", authenticate, listUsers);

// Admin only
router.post("/register", authenticate, authorize("Admin"), registerUser);
router.get("/:id", authenticate, authorize("Admin"), getUser);
router.put("/:id", authenticate, authorize("Admin"), editUser);
router.put("/:id/deactivate", authenticate, authorize("Admin"), deactivateUser);
router.delete("/:id", authenticate, authorize("Admin"), removeUser);

export default router;
