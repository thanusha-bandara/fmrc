import express from "express";
import { listAvailability, setAvailability, removeAvailability, listFarmDailyStatusController, setFarmDailyStatusController, listFarmSeasonsController, setFarmSeasonController, deleteFarmSeasonController } from "../controllers/resourceController.js";
import { authenticate, authorize } from "../middlware/auth.js";

const router = express.Router();

router.use(authenticate);

// Fields are now globally managed. Resource Management is view-only for
// everyone except Technical Assistants, who are the only role allowed to
// change anything here.
router.get("/farm-daily-status", listFarmDailyStatusController);
router.post("/farm-daily-status", authorize("Technical_Assistant"), setFarmDailyStatusController);


router.get("/farm-seasons", listFarmSeasonsController);
router.post("/farm-seasons", authorize("Technical_Assistant"), setFarmSeasonController);
router.delete("/farm-seasons/:id", authorize("Technical_Assistant"), deleteFarmSeasonController);

// Human resource availability
router.get("/staff-availability", listAvailability);
router.post("/staff-availability", authorize("Technical_Assistant"), setAvailability);
router.delete("/staff-availability/:id", authorize("Technical_Assistant"), removeAvailability);

export default router;
