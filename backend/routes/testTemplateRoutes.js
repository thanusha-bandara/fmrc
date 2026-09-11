import express from "express";
import { generateStandardTestSet, getCatalogs } from "../controllers/testTemplateController.js";
import { authenticate, authorize } from "../middlware/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/catalogs", getCatalogs);
router.post("/generate", authorize("Admin", "Mechanical_Engineer"), generateStandardTestSet);

export default router;
