import express from "express";
import { listFields, addField, editField, removeField, listAvailability, setAvailability, removeAvailability } from "../controllers/resourceController.js";
import { authenticate, authorize } from "../middlware/auth.js";

const router = express.Router();

router.use(authenticate);

// Field availability
router.get("/fields", listFields);
router.post("/fields", authorize("Admin", "Technical_Assistant"), addField);
router.put("/fields/:id", authorize("Admin", "Technical_Assistant"), editField);
router.delete("/fields/:id", authorize("Admin"), removeField);

// Human resource availability
router.get("/staff-availability", listAvailability);
router.post("/staff-availability", authorize("Admin", "Technical_Assistant"), setAvailability);
router.delete("/staff-availability/:id", authorize("Admin", "Technical_Assistant"), removeAvailability);

export default router;
