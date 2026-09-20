import express from 'express';
import {
    listLabours,
    createLabour,
    updateLabour,
    deleteLabour,
    setLabourAvailability,
    listLabourAvailability
} from '../controllers/labourController.js';
import { authenticate, authorize } from '../middlware/auth.js';

const router = express.Router();

router.use(authenticate);

// Only Technical Assistants can change labour records; everyone else views them.
router.get('/', listLabours);
router.post('/', authorize('Technical_Assistant'), createLabour);
router.put('/:id', authorize('Technical_Assistant'), updateLabour);
router.delete('/:id', authorize('Technical_Assistant'), deleteLabour);

// Labour Availability
router.get('/availability', listLabourAvailability);
router.post('/availability', authorize('Technical_Assistant'), setLabourAvailability);

export default router;
