import express from 'express';
import { markHoliday, listHolidays, removeHoliday } from '../controllers/calendarController.js';
import { authenticate, authorize } from '../middlware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', listHolidays);
// Route to manually mark a holiday/shramadana day
router.post('/holiday', authorize('Admin', 'Technical_Assistant'), markHoliday);
router.delete('/holiday/:id', authorize('Admin', 'Technical_Assistant'), removeHoliday);

export default router;
