import express from "express";
import { listAvailability, setAvailability, removeAvailability, listFarmDailyStatusController, setFarmDailyStatusController, listFarmSeasonsController, setFarmSeasonController, deleteFarmSeasonController } from "../controllers/resourceController.js";
import { authenticate, authorize } from "../middlware/auth.js";

const router = express.Router();

router.use(authenticate);

// Fields are now globally managed
router.get("/farm-daily-status", listFarmDailyStatusController);
router.post("/farm-daily-status", authorize("Admin", "Technical_Assistant"), setFarmDailyStatusController);


router.get("/farm-seasons", listFarmSeasonsController);
router.post("/farm-seasons", authorize("Admin", "Technical_Assistant"), setFarmSeasonController);
router.delete("/farm-seasons/:id", authorize("Admin", "Technical_Assistant"), deleteFarmSeasonController);

// Human resource availability
router.get("/staff-availability", listAvailability);
router.post("/staff-availability", authorize("Admin", "Technical_Assistant"), setAvailability);
router.delete("/staff-availability/:id", authorize("Admin", "Technical_Assistant"), removeAvailability);

// Labour availability
router.get("/labour-availability", listLabourAvailability);
router.post("/labour-availability", authorize("Admin", "Technical_Assistant"), setLabourAvailability);
router.delete("/labour-availability/:id", authorize("Admin", "Technical_Assistant"), removeLabourAvailability);

export default router;
