import express from "express";
import { listLabours, addLabour, editLabour, deactivateLabour, removeLabour } from "../controllers/labourController.js";
import { authenticate, authorize } from "../middlware/auth.js";

const router = express.Router();

router.use(authenticate);

// Any authenticated role can view the roster (needed by the labour-availability picker).
router.get("/", listLabours);

// Admin only: manage the roster.
router.post("/", authorize("Admin"), addLabour);
router.put("/:id", authorize("Admin"), editLabour);
router.put("/:id/deactivate", authorize("Admin"), deactivateLabour);
router.delete("/:id", authorize("Admin"), removeLabour);

export default router;
