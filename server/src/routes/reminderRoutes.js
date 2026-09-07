import { Router } from 'express';
import { ReminderController } from '../controllers/reminderController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// All reminder endpoints require valid JWT authentication
router.use(authenticateToken);

router.get('/', ReminderController.getReminderSettings);
router.put('/', ReminderController.updateReminderSettings);
router.patch('/', ReminderController.updateReminderSettings);
router.post('/enable', ReminderController.enableReminders);
router.post('/disable', ReminderController.disableReminders);
router.post('/send-test', ReminderController.sendTestReminder);

export default router;
