import crypto from 'crypto';
import { pushNotificationService } from '../services/pushNotificationService.js';
import { processDailyPushNotifications } from '../../scripts/sendDailyPushNotifications.js';
import { getLagosDateString } from '../services/motivationService.js';
import { config } from '../config/env.js';

// In-process lock and completion guard for single-instance protection
let isPushDispatching = false;
let lastSuccessfulPushDate = null;

function safeCompare(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  if (!provided || !expected) return false;
  const bufProvided = Buffer.from(provided);
  const bufExpected = Buffer.from(expected);
  if (bufProvided.length !== bufExpected.length) return false;
  return crypto.timingSafeEqual(bufProvided, bufExpected);
}

export class NotificationController {
  /**
   * GET /api/notifications/vapid-key
   * Returns the public VAPID key so the browser can create a push subscription.
   */
  static async getVapidKey(req, res, next) {
    try {
      const publicKey = pushNotificationService.getVapidPublicKey();
      res.status(200).json({
        success: true,
        publicKey,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/notifications/subscribe
   * Registers or updates a user's browser push subscription.
   */
  static async subscribe(req, res, next) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const subscriptionData = req.body?.subscription || req.body;

      if (!subscriptionData || !subscriptionData.endpoint) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_SUBSCRIPTION',
          message: 'Valid push subscription object with endpoint is required.',
        });
      }

      const saved = await pushNotificationService.subscribeUser(userId, subscriptionData);

      res.status(200).json({
        success: true,
        message: 'Push notification subscription registered successfully.',
        data: saved,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/notifications/trigger-daily-push
   * Protected cron trigger endpoint for 05:00 Africa/Lagos push-only notifications.
   */
  static async triggerDailyPush(req, res, next) {
    try {
      // 1. Authenticate Cron Secret
      const authHeader = req.headers['authorization'];
      const bearerSecret = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
      const providedSecret = req.headers['x-cron-secret'] || bearerSecret || req.query?.secret;
      const expectedSecret = config.cronSecret;

      if (!expectedSecret || !providedSecret || !safeCompare(String(providedSecret), String(expectedSecret))) {
        return res.status(401).json({
          success: false,
          code: 'UNAUTHORIZED',
          message: 'Unauthorized: Missing or invalid cron secret.',
        });
      }

      // 2. Prevent concurrent simultaneous runs
      if (isPushDispatching) {
        return res.status(409).json({
          success: false,
          code: 'CONCURRENT_EXECUTION',
          message: 'Daily push notification dispatch is already in progress.',
        });
      }

      // 3. Prevent duplicate runs on the same calendar date in Africa/Lagos
      const targetDate = getLagosDateString(req.query?.date || req.body?.date || null);
      const isForced = req.query?.force === 'true' || req.body?.force === true;

      if (lastSuccessfulPushDate === targetDate && !isForced) {
        return res.status(200).json({
          success: true,
          skipped: true,
          message: `Daily push notifications already dispatched for ${targetDate}.`,
          data: {
            date: targetDate,
            alreadyCompleted: true,
          },
        });
      }

      // 4. Execute dedicated push notification workflow (push only, pool kept open)
      isPushDispatching = true;
      try {
        const summary = await processDailyPushNotifications(targetDate, null, { shouldClosePool: false });
        lastSuccessfulPushDate = targetDate;

        return res.status(200).json({
          success: true,
          message: `Daily push notifications dispatched successfully for ${summary.date}.`,
          data: {
            date: summary.date,
            eligibleUsers: summary.eligibleUsers,
            devicesTargeted: summary.devicesTargeted,
            pushSent: summary.pushSent,
            pushFailed: summary.pushFailed,
            errorsCount: summary.errors?.length || 0,
          },
        });
      } finally {
        isPushDispatching = false;
      }
    } catch (error) {
      console.error('[NotificationController Error] triggerDailyPush failed:', error);
      next(error);
    }
  }

  /**
   * Reset in-memory push state (for test isolation)
   */
  static _resetPushState() {
    isPushDispatching = false;
    lastSuccessfulPushDate = null;
  }
}

