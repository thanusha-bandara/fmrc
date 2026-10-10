import express from 'express';
import { generateSchedule, getSchedules } from '../controllers/sheduleController.js';
import { authenticate, authorize } from '../middlware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getSchedules);
router.post('/generate', authorize('Admin'), generateSchedule);

export default router;