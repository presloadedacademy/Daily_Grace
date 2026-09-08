import webpush from 'web-push';
import { config } from '../config/env.js';
import { PushSubscriptionRepository } from '../repositories/pushSubscriptionRepository.js';

class PushNotificationService {
  constructor() {
    this.initVapid();
  }

  initVapid() {
    if (config.vapid.publicKey && config.vapid.privateKey) {
      try {
        webpush.setVapidDetails(
          config.vapid.subject,
          config.vapid.publicKey,
          config.vapid.privateKey
        );
      } catch (err) {
        console.warn('[PushNotificationService] Failed to initialize VAPID details:', err.message);
      }
    }
  }

  /**
   * Get the public VAPID key for client subscriptions.
   */
  getVapidPublicKey() {
    return config.vapid.publicKey;
  }

  /**
   * Save or update a user's web push subscription.
   * Supports standard PushSubscription JSON { endpoint, keys: { p256dh, auth } }
   */
  async subscribeUser(userId, subscriptionData) {
    if (!subscriptionData || !subscriptionData.endpoint) {
      throw new Error('Valid push subscription endpoint is required.');
    }

    const endpoint = subscriptionData.endpoint;
    const p256dh = subscriptionData.keys?.p256dh || subscriptionData.p256dh;
    const auth = subscriptionData.keys?.auth || subscriptionData.auth;

    if (!p256dh || !auth) {
      throw new Error('Push subscription keys (p256dh, auth) are required.');
    }

    return PushSubscriptionRepository.saveSubscription({
      userId,
      endpoint,
      p256dh,
      auth,
    });
  }

  /**
   * Send a push notification to a specific stored subscription.
   */
  async sendPushNotification(subscription, payload) {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

    try {
      await webpush.sendNotification(pushSubscription, payloadString);
      return { success: true, endpoint: subscription.endpoint };
    } catch (error) {
      // 404 or 410 indicates the subscription has expired or been revoked
      if (error.statusCode === 404 || error.statusCode === 410) {
        console.log(`[PushNotificationService] Removing expired push subscription: ${subscription.endpoint}`);
        await PushSubscriptionRepository.deleteSubscriptionByEndpoint(subscription.endpoint);
      } else {
        console.error(`[PushNotificationService] Error sending push to ${subscription.endpoint}:`, error.message);
      }
      return { success: false, endpoint: subscription.endpoint, error: error.message };
    }
  }

  /**
   * Send a push notification to all active devices registered to a user.
   */
  async sendPushToUser(userId, { title = 'Daily Grace 🌿', body = "Today's devotional is ready for you.", url = '/today', tag = 'daily-devotion' }) {
    if (!userId) return { sent: 0, failed: 0 };

    const subscriptions = await PushSubscriptionRepository.findSubscriptionsByUserId(userId);
    if (!subscriptions || subscriptions.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const payload = {
      title,
      body,
      url,
      tag,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      timestamp: Date.now(),
    };

    let sent = 0;
    let failed = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        const res = await this.sendPushNotification(sub, payload);
        if (res.success) sent++;
        else failed++;
      })
    );

    return { sent, failed, total: subscriptions.length };
  }
}

export { PushNotificationService };
export const pushNotificationService = new PushNotificationService();
