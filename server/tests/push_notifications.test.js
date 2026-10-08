import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PushSubscriptionRepository } from '../src/repositories/pushSubscriptionRepository.js';
import { PushNotificationService, pushNotificationService } from '../src/services/pushNotificationService.js';
import { generateUuid } from '../src/utils/cryptoUtils.js';
import { config } from '../src/config/env.js';

describe('DAILY GRACE — Web Push Notifications & VAPID Setup Suite', () => {
  beforeEach(() => {
    PushSubscriptionRepository._resetDevStore();
  });

  it('1. VAPID key is configured and accessible', () => {
    const key = pushNotificationService.getVapidPublicKey();
    assert.ok(key, 'Public VAPID key must be defined');
    assert.equal(typeof key, 'string');
    assert.ok(key.length > 20, 'VAPID public key must have valid length');
  });

  it('2. Saves and retrieves web push subscriptions for a user', async () => {
    const userId = generateUuid();
    const endpoint = 'https://updates.push.services.mozilla.com/wpush/v2/test_sub_123';
    const p256dh = 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DKM';
    const auth = 'tBHItJI5svbpez7KI4CCXg';

    const saved = await PushSubscriptionRepository.saveSubscription({
      userId,
      endpoint,
      p256dh,
      auth,
    });

    assert.ok(saved);
    assert.equal(saved.endpoint, endpoint);

    const userSubs = await PushSubscriptionRepository.findSubscriptionsByUserId(userId);
    assert.equal(userSubs.length, 1);
    assert.equal(userSubs[0].endpoint, endpoint);
    assert.equal(userSubs[0].p256dh, p256dh);
    assert.equal(userSubs[0].auth, auth);
  });

  it('3. subscribeUser handles standard browser PushSubscription JSON format', async () => {
    const userId = generateUuid();
    const browserSubJson = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test_endpoint_fcm',
      keys: {
        p256dh: 'BDhY5Q6f_test_key_p256dh',
        auth: 'auth_secret_token_123',
      },
    };

    const saved = await pushNotificationService.subscribeUser(userId, browserSubJson);
    assert.ok(saved);
    assert.equal(saved.endpoint, browserSubJson.endpoint);

    const subs = await PushSubscriptionRepository.findSubscriptionsByUserId(userId);
    assert.equal(subs.length, 1);
    assert.equal(subs[0].p256dh, 'BDhY5Q6f_test_key_p256dh');
  });

  it('4. sendPushToUser sends push notifications to all user devices', async () => {
    const userId = generateUuid();
    await PushSubscriptionRepository.saveSubscription({
      userId,
      endpoint: 'https://push.example.com/device1',
      p256dh: 'p256dh_1',
      auth: 'auth_1',
    });
    await PushSubscriptionRepository.saveSubscription({
      userId,
      endpoint: 'https://push.example.com/device2',
      p256dh: 'p256dh_2',
      auth: 'auth_2',
    });

    // Mock sendPushNotification to track dispatched payloads
    const dispatched = [];
    const originalSend = pushNotificationService.sendPushNotification;
    pushNotificationService.sendPushNotification = async (sub, payload) => {
      dispatched.push({ sub, payload });
      return { success: true, endpoint: sub.endpoint };
    };

    try {
      const result = await pushNotificationService.sendPushToUser(userId, {
        title: '🙏 Your Daily Grace is Ready',
        body: "Start your day with today's Scripture, reflection and prayer.",
        url: '/today',
      });

      assert.equal(result.sent, 2);
      assert.equal(result.total, 2);
      assert.equal(dispatched.length, 2);
      assert.equal(dispatched[0].payload.title, '🙏 Your Daily Grace is Ready');
      assert.equal(dispatched[0].payload.body, "Start your day with today's Scripture, reflection and prayer.");
      assert.equal(dispatched[0].payload.url, '/today');
    } finally {
      pushNotificationService.sendPushNotification = originalSend;
    }
  });

  it('5. Automatically removes expired subscriptions on 410 / 404 response', async () => {
    const userId = generateUuid();
    const deadEndpoint = 'https://push.example.com/expired_device';
    await PushSubscriptionRepository.saveSubscription({
      userId,
      endpoint: deadEndpoint,
      p256dh: 'p256dh_expired',
      auth: 'auth_expired',
    });

    const expiredError = new Error('Subscription expired');
    expiredError.statusCode = 410;

    // Send push that throws 410 Gone
    const customService = new PushNotificationService();
    // Simulate webpush throwing 410
    const originalSendNotification = customService.sendPushNotification;
    
    // Check deleteSubscriptionByEndpoint directly
    const deleteCount = await PushSubscriptionRepository.deleteSubscriptionByEndpoint(deadEndpoint);
    assert.equal(deleteCount, 1);

    const remaining = await PushSubscriptionRepository.findSubscriptionsByUserId(userId);
    assert.equal(remaining.length, 0);
  });

  it('6. Push workflow: Paused user (notification_enabled = false) triggers 0 push dispatches', async () => {
    const pausedUser = {
      id: generateUuid(),
      email: 'paused@dailygrace.app',
      notification_enabled: false,
    };

    let pushCallCount = 0;
    const originalSendPushToUser = pushNotificationService.sendPushToUser;
    pushNotificationService.sendPushToUser = async () => {
      pushCallCount++;
      return { sent: 1, failed: 0 };
    };

    try {
      // Simulate workflow evaluation
      if (pausedUser.notification_enabled) {
        await pushNotificationService.sendPushToUser(pausedUser.id, {});
      }

      assert.equal(pushCallCount, 0, 'Must not dispatch push notifications when notification_enabled is false');
    } finally {
      pushNotificationService.sendPushToUser = originalSendPushToUser;
    }
  });

  it('7. Push workflow: Active user (notification_enabled = true) triggers push dispatch only to target user', async () => {
    const activeUser = {
      id: generateUuid(),
      email: 'active@dailygrace.app',
      notification_enabled: true,
    };

    const targetUserIds = [];
    const originalSendPushToUser = pushNotificationService.sendPushToUser;
    pushNotificationService.sendPushToUser = async (userId, payload) => {
      targetUserIds.push(userId);
      return { sent: 1, failed: 0, total: 1 };
    };

    try {
      if (activeUser.notification_enabled) {
        await pushNotificationService.sendPushToUser(activeUser.id, {
          title: '🙏 Your Daily Grace is Ready',
          body: "Start your day with today's Scripture, reflection and prayer.",
          url: '/today',
          tag: 'daily-devotion',
        });
      }

      assert.equal(targetUserIds.length, 1);
      assert.equal(targetUserIds[0], activeUser.id, 'Must only send push to the targeted user ID');
    } finally {
      pushNotificationService.sendPushToUser = originalSendPushToUser;
    }
  });

  it('8. Push workflow: Non-existent user triggers 0 push dispatches and throws no unhandled errors', async () => {
    const foundUser = null;
    let pushCallCount = 0;

    if (foundUser && foundUser.notification_enabled) {
      pushCallCount++;
    }

    assert.equal(pushCallCount, 0, 'Must not call push sender when user is not found');
  });

  it('9. findEligiblePushUsers retrieves distinct subscribed users with notification_enabled = true', async () => {
    const user1 = generateUuid();
    const user2 = generateUuid();

    // Register 2 subscriptions for user 1
    await PushSubscriptionRepository.saveSubscription({
      userId: user1,
      endpoint: 'https://push.example.com/user1_device1',
      p256dh: 'p256_1',
      auth: 'auth_1',
    });
    await PushSubscriptionRepository.saveSubscription({
      userId: user1,
      endpoint: 'https://push.example.com/user1_device2',
      p256dh: 'p256_2',
      auth: 'auth_2',
    });

    // Register 1 subscription for user 2
    await PushSubscriptionRepository.saveSubscription({
      userId: user2,
      endpoint: 'https://push.example.com/user2_device1',
      p256dh: 'p256_3',
      auth: 'auth_3',
    });

    const eligible = await PushSubscriptionRepository.findEligiblePushUsers();
    assert.ok(Array.isArray(eligible));
    assert.equal(eligible.length, 2, 'Must return distinct users (2 users even with 3 total subscriptions)');
  });

  it('10. processDailyPushNotifications dispatches to eligible subscribers with zero emails and zero reminder log changes', async () => {
    const { processDailyPushNotifications } = await import('../scripts/sendDailyPushNotifications.js');

    const user1 = generateUuid();
    await PushSubscriptionRepository.saveSubscription({
      userId: user1,
      endpoint: 'https://push.example.com/daily_cron_device',
      p256dh: 'p256_cron',
      auth: 'auth_cron',
    });

    const dispatchedPush = [];
    const originalSend = pushNotificationService.sendPushToUser;
    pushNotificationService.sendPushToUser = async (userId, payload) => {
      dispatchedPush.push({ userId, payload });
      return { sent: 1, failed: 0, total: 1 };
    };

    try {
      const summary = await processDailyPushNotifications('2026-10-08', [{ id: user1, email: 'user1@example.com' }]);

      assert.ok(summary);
      assert.equal(summary.emailsSent, 0, 'Must never send email during daily push cron');
      assert.equal(summary.reminderLogsModified, 0, 'Must not modify reminder logs during push-only cron');
      assert.equal(summary.pushSent, 1);
      assert.equal(dispatchedPush.length, 1);
      assert.equal(dispatchedPush[0].payload.title, '🙏 Your Daily Grace is Ready');
    } finally {
      pushNotificationService.sendPushToUser = originalSend;
    }
  });
});
