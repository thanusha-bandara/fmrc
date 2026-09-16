import express from 'express';
import {
    listLabours,
    createLabour,
    updateLabour,
    deleteLabour,
    setLabourAvailability,
    listLabourAvailability
} from '../controllers/labourController.js';
import { authenticate } from '../middlware/auth.js';

const router = express.Router();

router.use(authenticate);

// Labour Management
router.get('/', listLabours);
router.post('/', createLabour);
router.put('/:id', updateLabour);
router.delete('/:id', deleteLabour);

// Labour Availability
router.get('/availability', listLabourAvailability);
router.post('/availability', setLabourAvailability);

export default router;
