import { Router } from 'express';
import { MotivationController } from '../controllers/motivationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/motivations/email-complete and /api/motivations/complete-by-token (One-click completion from email)
router.get('/email-complete', MotivationController.completeByToken);
router.get('/complete-by-token', MotivationController.completeByToken);

// GET /api/motivations/today or /api/motivations or /api/daily (Protected)
router.get('/', authenticateToken, MotivationController.getTodaysMotivation);
router.get('/today', authenticateToken, MotivationController.getTodaysMotivation);
router.get('/daily', authenticateToken, MotivationController.getTodaysMotivation);

// POST /api/motivations/complete or /api/motivations/today/complete (Protected)
router.post('/complete', authenticateToken, MotivationController.markCompleted);
router.post('/today/complete', authenticateToken, MotivationController.markCompleted);

export default router;
