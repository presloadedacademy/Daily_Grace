import jwt from 'jsonwebtoken';
import { MotivationService } from '../services/motivationService.js';
import { config } from '../config/env.js';

export class MotivationController {
  /**
   * GET /api/motivations/today
   * Retrieves today's motivation for the authenticated user.
   */
  static async getTodaysMotivation(req, res, next) {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'User authentication required.' });
      }
      const customDate = req.query?.date || req.body?.date || null;
      const motivation = await MotivationService.getTodaysMotivation(userId, customDate);

      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.status(200).json({
        success: true,
        data: motivation,
      });
    } catch (error) {
      console.error('[MotivationController Error] Failed to get today motivation:', error);
      next(error);
    }
  }


  /**
   * POST /api/motivations/complete
   * Marks today's devotion completed for the authenticated user in the web app.
   */
  static async markCompleted(req, res, next) {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'User authentication required.' });
      }

      const customDate = req.body?.date || null;
      const result = await MotivationService.markDevotionCompleted(userId, customDate);

      res.status(200).json({
        success: true,
        message: 'Devotional marked as completed.',
        is_completed: true,
        streak: result.current_streak,
        data: result,
      });
    } catch (error) {
      console.error('Error completing motivation:', error);
      next(error);
    }
  }

  /**
   * Alias for markCompleted
   */
  static async completeMotivation(req, res, next) {
    return MotivationController.markCompleted(req, res, next);
  }

  /**
   * GET /api/motivations/complete-by-token
   * One-click completion from daily email reminder.
   */
  static async completeByToken(req, res, next) {
    try {
      const { token, userId: queryUserId } = req.query;

      if (!token) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Daily Grace</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h2>Invalid Completion Link</h2>
              <p>The link is missing a verification token.</p>
              <a href="${config.clientUrl}/today">Go to Daily Grace</a>
            </body>
          </html>
        `);
      }

      let payload;
      try {
        payload = jwt.verify(token, config.jwtSecret);
      } catch (err) {
        return res.status(401).send(`
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Daily Grace</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h2>Link Expired or Invalid</h2>
              <p>This completion link has expired or is invalid.</p>
              <a href="${config.clientUrl}/today">Open Daily Grace</a>
            </body>
          </html>
        `);
      }

      if (payload.action !== 'complete_devotion') {
        return res.status(400).json({ success: false, message: 'Invalid token action.' });
      }

      const targetUserId = payload.userId || queryUserId;
      if (!targetUserId) {
        return res.status(400).json({ success: false, message: 'User ID missing in token.' });
      }

      const result = await MotivationService.markDevotionCompleted(targetUserId, payload.date);

      // Redirect to the app with completed flag and streak
      const redirectUrl = `${config.clientUrl}/today?completed=true&streak=${result.current_streak}`;
      return res.redirect(302, redirectUrl);
    } catch (error) {
      next(error);
    }
  }
}
