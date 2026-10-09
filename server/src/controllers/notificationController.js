import crypto from 'crypto';
import { pushNotificationService } from '../services/pushNotificationService.js';
import { processDailyPushNotifications } from '../../scripts/sendDailyPushNotifications.js';
import { getLagosDateString } from '../services/motivationService.js';
import { UserRepository } from '../repositories/userRepository.js';
import { PushSubscriptionRepository } from '../repositories/pushSubscriptionRepository.js';
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
   * POST /api/notifications/test-push
   * Protected single-user test push notification endpoint.
   */
  static async testPush(req, res, next) {
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

      // 2. Validate email parameter
      const rawEmail = req.body?.email || req.query?.email;
      if (!rawEmail || typeof rawEmail !== 'string' || !rawEmail.trim()) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_REQUEST',
          message: 'Valid user email is required in the request body.',
        });
      }

      const email = rawEmail.trim().toLowerCase();

      // 3. Find only that exact user in PostgreSQL
      const user = await UserRepository.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          code: 'USER_NOT_FOUND',
          message: `User with email "${email}" was not found.`,
          data: {
            userFound: false,
            email,
            notificationEnabled: false,
            devicesFound: 0,
            sent: 0,
            failed: 0,
          },
        });
      }

      // 4. Check user's notification_enabled preference
      if (!user.notification_enabled) {
        return res.status(200).json({
          success: false,
          code: 'NOTIFICATIONS_PAUSED',
          message: `User ${email} has notifications paused/disabled.`,
          data: {
            userFound: true,
            email: user.email,
            notificationEnabled: false,
            devicesFound: 0,
            sent: 0,
            failed: 0,
          },
        });
      }

      // 5. Retrieve only that user's push subscriptions
      const subscriptions = await PushSubscriptionRepository.findSubscriptionsByUserId(user.id);
      if (!subscriptions || subscriptions.length === 0) {
        return res.status(200).json({
          success: false,
          code: 'NO_SUBSCRIPTIONS',
          message: `No active push subscriptions found for ${email}.`,
          data: {
            userFound: true,
            email: user.email,
            notificationEnabled: true,
            devicesFound: 0,
            sent: 0,
            failed: 0,
          },
        });
      }

      // 6. Send exactly one test push notification to that user's registered devices only
      const testPayload = {
        title: '🙏 Daily Grace Test',
        body: 'Your phone is successfully connected to Daily Grace notifications!',
        url: '/today',
        tag: 'daily-grace-test',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
      };

      let sent = 0;
      let failed = 0;

      for (const sub of subscriptions) {
        const result = await pushNotificationService.sendPushNotification(sub, testPayload);
        if (result.success) {
          sent++;
        } else {
          failed++;
        }
      }

      return res.status(200).json({
        success: true,
        message: `Test push notification processed for ${user.email}.`,
        data: {
          userFound: true,
          email: user.email,
          notificationEnabled: true,
          devicesFound: subscriptions.length,
          sent,
          failed,
        },
      });
    } catch (error) {
      console.error('[NotificationController Error] testPush failed:', error);
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

