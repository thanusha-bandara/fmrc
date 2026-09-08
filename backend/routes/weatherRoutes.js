import express from 'express';
import { setManualWeather, listWeatherLogs, refreshWeather } from '../controllers/weatherController.js';
import { authenticate, authorize } from '../middlware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', listWeatherLogs);
router.post('/refresh', refreshWeather);
// Route to manually update weather
router.post('/manual', authorize('Admin', 'Technical_Assistant'), setManualWeather);

export default router;
