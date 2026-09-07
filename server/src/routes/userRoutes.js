import { Router } from 'express';
import { UserController } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// All user routes require valid JWT authentication
router.use(authenticateToken);

router.get('/profile', UserController.getProfile);
router.patch('/profile', UserController.updateProfile);
router.patch('/preferences', UserController.updatePreferences);
router.post('/complete-onboarding', UserController.completeOnboarding);
router.patch('/onboarding', UserController.completeOnboarding);
router.post('/reset-journey', UserController.resetJourney);

export default router;

