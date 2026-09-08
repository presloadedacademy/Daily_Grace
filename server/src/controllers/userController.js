import { UserService } from '../services/userService.js';

export class UserController {
  /**
   * GET /api/users/profile
   */
  static async getProfile(req, res, next) {
    try {
      const profile = await UserService.getProfile(req.user.userId);
      res.status(200).json({
        success: true,
        user: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/users/profile
   */
  static async updateProfile(req, res, next) {
    try {
      const { name } = req.body;
      const updatedUser = await UserService.updateName(req.user.userId, name);
      res.status(200).json({
        success: true,
        message: 'Name updated successfully.',
        user: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/users/preferences
   */
  static async updatePreferences(req, res, next) {
    try {
      const { notificationEnabled } = req.body;
      const result = await UserService.updatePreferences(req.user.userId, notificationEnabled);
      res.status(200).json({
        success: true,
        message: 'Notification preference updated successfully.',
        preferences: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/users/complete-onboarding or PATCH /api/users/onboarding
   */
  static async completeOnboarding(req, res, next) {
    try {
      const completed = req.body?.completed !== undefined ? req.body.completed : true;
      const result = await UserService.completeOnboarding(req.user.userId, completed);
      res.status(200).json({
        success: true,
        message: 'Onboarding marked as completed.',
        onboarding_completed: result.onboarding_completed,
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/users/reset-journey
   */
  static async resetJourney(req, res, next) {

    try {
      const result = await UserService.resetJourney(req.user.userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/users/me
   */
  static async deleteAccount(req, res, next) {
    try {
      const result = await UserService.deleteAccount(req.user.userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
