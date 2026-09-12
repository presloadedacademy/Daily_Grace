import { UserService } from '../services/userService.js';
import { MotivationService } from '../services/motivationService.js';
import { ReminderService } from '../services/reminderService.js';
import { emailService } from '../services/emailService.js';
import { AppError } from '../services/authService.js';

export class ReminderController {
  /**
   * GET or POST /api/reminders/trigger-daily
   * Triggers the daily 5:00 AM devotions dispatcher.
   */
  static async triggerDailyReminders(req, res, next) {
    try {
      const customDate = req.query?.date || req.body?.date || null;
      console.log('[ReminderScheduler] Triggering 5 AM daily devotions dispatcher...');
      const result = await ReminderService.processDailyReminders(customDate);
      return res.status(200).json({
        success: true,
        message: 'Daily 5 AM devotions triggered successfully',
        data: result,
      });
    } catch (error) {
      console.error('[ReminderController Error] Failed to trigger daily reminders:', error);
      next(error);
    }
  }

  /**
   * GET /api/reminders
   * Get current authenticated user's reminder settings.
   */
  static async getReminderSettings(req, res, next) {
    try {
      const profile = await UserService.getProfile(req.user.userId);
      res.status(200).json({
        success: true,
        enabled: Boolean(profile.notification_enabled),
        email: profile.email,
        name: profile.name,
        schedule: '05:00 AM (Daily)',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/reminders or PATCH /api/reminders
   * Update reminder enabled status.
   */
  static async updateReminderSettings(req, res, next) {
    try {
      const rawEnabled = req.body.enabled !== undefined ? req.body.enabled : req.body.notificationEnabled;
      if (typeof rawEnabled !== 'boolean') {
        throw new AppError('The "enabled" field must be a boolean (true or false).', 400, 'VALIDATION_ERROR');
      }

      const result = await UserService.updatePreferences(req.user.userId, rawEnabled);
      res.status(200).json({
        success: true,
        message: `Daily reminders have been ${result.notification_enabled ? 'enabled' : 'disabled'}.`,
        enabled: result.notification_enabled,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/reminders/enable
   * Convenient helper to enable reminders.
   */
  static async enableReminders(req, res, next) {
    try {
      const result = await UserService.updatePreferences(req.user.userId, true);
      res.status(200).json({
        success: true,
        message: 'Daily reminders have been enabled.',
        enabled: result.notification_enabled,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/reminders/disable
   * Convenient helper to disable reminders.
   */
  static async disableReminders(req, res, next) {
    try {
      const result = await UserService.updatePreferences(req.user.userId, false);
      res.status(200).json({
        success: true,
        message: 'Daily reminders have been disabled.',
        enabled: result.notification_enabled,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/reminders/send-test
   * Send a test daily reminder email to the authenticated user's registered address.
   */
  static async sendTestReminder(req, res, next) {
    try {
      const profile = await UserService.getProfile(req.user.userId);
      const today = new Date().toISOString().split('T')[0];
      const motivation = await MotivationService.getTodaysMotivation(req.user.userId, today);

      const emailResult = await emailService.sendDailyReminderEmail({
        to: profile.email,
        name: profile.name,
        motivation,
      });

      res.status(200).json({
        success: true,
        message: `Test daily reminder sent to ${profile.email}.`,
        result: emailResult,
      });
    } catch (error) {
      next(error);
    }
  }
}
