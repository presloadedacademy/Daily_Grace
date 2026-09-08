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

  /**
   * POST /api/motivations/complete
   * Marks today's devotion completed for the authenticated user in the web app.
   */
  static async markCompleted(req, res, next) {
    try {
      const userId = req.user.userId;
      const customDate = req.body?.date || null;
      const result = await MotivationService.markDevotionCompleted(userId, customDate);

      res.status(200).json({
        success: true,
        message: 'Devotional marked as completed.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
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
