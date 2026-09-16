import express from "express";
import {
    createTest,
    getTests,
    getTest,
    saveTestData,
    submitTest,
    reviewTest,
    decideTest,
    removeTest
} from "../controllers/testController.js";
import { authenticate, authorize } from "../middlware/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getTests);
router.get("/:id", getTest);


router.post("/", authorize("Admin", "Mechanical_Engineer"), createTest);
router.delete("/:id", authorize("Admin"), removeTest);

// Technical Assistant: data entry (Tier 1)
router.put("/:id/data", authorize("Technical_Assistant"), saveTestData);
router.post("/:id/submit", authorize("Technical_Assistant"), submitTest);

// Mechanical Engineer: review & recommend (Tier 2)
router.post("/:id/review", authorize("Mechanical_Engineer"), reviewTest);

// Chief Engineer: final approval (Tier 3)
router.post("/:id/decide", authorize("Chief_Engineer"), decideTest);

export default router;
