import { pushNotificationService } from '../services/pushNotificationService.js';

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
}
