import express from 'express';
import { setManualWeather, listWeatherLogs, refreshWeather } from '../controllers/weatherController.js';
import { authenticate, authorize } from '../middlware/auth.js';

const router = express.Router();

router.use(authenticate);

// Only Technical Assistants can change weather data; everyone else views it.
router.get('/', listWeatherLogs);
router.post('/refresh', authorize('Technical_Assistant'), refreshWeather);
router.post('/manual', authorize('Technical_Assistant'), setManualWeather);

export default router;
