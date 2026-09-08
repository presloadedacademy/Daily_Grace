import { AuthService } from '../services/authService.js';
import { emailService } from '../services/emailService.js';

export class AuthController {
  /**
   * POST /api/auth/register
   */
  static async register(req, res, next) {
    try {
      const { name, email, password, confirmPassword } = req.body;
      const result = await AuthService.register({ name, email, password, confirmPassword });

      res.status(201).json({
        success: true,
        message: result.message || 'Account created successfully!',
        token: result.token,
        user: result.user,
        id: result.user?.id,
        name: result.user?.name,
        email: result.user?.email,
        email_verified: result.user?.email_verified,
      });
    } catch (error) {
      next(error);
    }
  }


  /**
   * GET / POST /api/auth/verify-email
   */
  static async verifyEmail(req, res, next) {
    try {
      const token = req.query.token || req.body?.token;
      const result = await AuthService.verifyEmail(token);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }


  /**
   * POST /api/auth/resend-verification
   */
  static async resendVerification(req, res, next) {
    try {
      const { email } = req.body;
      const result = await AuthService.resendVerification(email);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login({ email, password });

      res.status(200).json({
        success: true,
        message: 'Logged in successfully.',
        token: result.token,
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me (Protected)
   */
  static async getMe(req, res, next) {
    try {
      const user = await AuthService.getMe(req.user.userId);
      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'user',
          email_verified: user.email_verified,
          notification_enabled: user.notification_enabled,
          onboarding_completed: Boolean(user.onboarding_completed),
          created_at: user.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }

}
