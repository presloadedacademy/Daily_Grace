import express from 'express';
import { NotificationController } from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/notifications/vapid-key (Public)
router.get('/vapid-key', NotificationController.getVapidKey);

// POST /api/notifications/subscribe (Authenticated)
router.post('/subscribe', authenticateToken, NotificationController.subscribe);

export default router;
