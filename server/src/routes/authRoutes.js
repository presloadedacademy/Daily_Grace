import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// Public Authentication Routes
router.post('/register', AuthController.register);
router.get('/verify-email', AuthController.verifyEmail);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/resend-verification', AuthController.resendVerification);
router.post('/login', AuthController.login);


// Protected Routes
router.get('/me', authenticateToken, AuthController.getMe);
router.post('/send-verification-otp', authenticateToken, AuthController.sendVerificationOtp);
router.post('/verify-otp', authenticateToken, AuthController.verifyEmailOtp);

export default router;
