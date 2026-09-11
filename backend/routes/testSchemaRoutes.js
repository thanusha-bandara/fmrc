import express from "express";
import { getTestSchema } from "../controllers/testSchemaController.js";
import { authenticate } from "../middlware/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/:testId", getTestSchema);

export default router;
