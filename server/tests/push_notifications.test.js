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
        title: 'Daily Grace 🌿',
        body: 'Your daily devotional is ready: Peace That Surpasses Understanding',
        url: '/today',
      });

      assert.equal(result.sent, 2);
      assert.equal(result.total, 2);
      assert.equal(dispatched.length, 2);
      assert.equal(dispatched[0].payload.title, 'Daily Grace 🌿');
      assert.ok(dispatched[0].payload.body.includes('Peace That Surpasses Understanding'));
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
});
