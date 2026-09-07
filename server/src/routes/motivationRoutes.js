import { Router } from 'express';
import { MotivationController } from '../controllers/motivationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/motivations/today or /api/motivations or /api/daily (Protected)
router.get('/', authenticateToken, MotivationController.getTodaysMotivation);
router.get('/today', authenticateToken, MotivationController.getTodaysMotivation);
router.get('/daily', authenticateToken, MotivationController.getTodaysMotivation);

export default router;

