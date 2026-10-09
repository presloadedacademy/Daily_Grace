import express from 'express';
import { NotificationController } from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/notifications/vapid-key (Public)
router.get('/vapid-key', NotificationController.getVapidKey);

// POST /api/notifications/subscribe (Authenticated)
router.post('/subscribe', authenticateToken, NotificationController.subscribe);

// POST /api/notifications/trigger-daily-push (Protected Cron Trigger)
router.post('/trigger-daily-push', NotificationController.triggerDailyPush);
router.all('/trigger-daily-push', (req, res) => {
  res.status(405).json({
    success: false,
    code: 'METHOD_NOT_ALLOWED',
    message: 'Method Not Allowed. Use POST.',
  });
});

// POST /api/notifications/test-push (Protected Single-User Test Push)
router.post('/test-push', NotificationController.testPush);
router.all('/test-push', (req, res) => {
  res.status(405).json({
    success: false,
    code: 'METHOD_NOT_ALLOWED',
    message: 'Method Not Allowed. Use POST.',
  });
});

export default router;
