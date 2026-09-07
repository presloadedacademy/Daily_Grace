import { MotivationService } from '../services/motivationService.js';

export class MotivationController {
  /**
   * GET /api/motivations/today
   * Retrieves today's motivation for the authenticated user.
   */
  static async getTodaysMotivation(req, res, next) {
    try {
      const userId = req.user.userId;
      const motivation = await MotivationService.getTodaysMotivation(userId);

      res.status(200).json({
        success: true,
        data: motivation,
      });
    } catch (error) {
      next(error);
    }
  }
}
