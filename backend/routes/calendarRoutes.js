import express from 'express';
import { markHoliday, listHolidays, removeHoliday, unmarkHoliday } from '../controllers/calendarController.js';
import { authenticate, authorize } from '../middlware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', listHolidays);
// Only Technical Assistants can change the calendar; everyone else views it.
router.post('/holiday', authorize('Technical_Assistant'), markHoliday);
router.delete('/holiday/:id', authorize('Technical_Assistant'), removeHoliday);
router.patch('/holiday/:id/unmark', authorize('Technical_Assistant'), unmarkHoliday);

export default router;
