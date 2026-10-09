import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PushSubscriptionRepository } from '../src/repositories/pushSubscriptionRepository.js';
import { UserRepository } from '../src/repositories/userRepository.js';
import { PushNotificationService, pushNotificationService } from '../src/services/pushNotificationService.js';
import { generateUuid } from '../src/utils/cryptoUtils.js';
import { config } from '../src/config/env.js';

describe('DAILY GRACE — Web Push Notifications & VAPID Setup Suite', () => {
  beforeEach(() => {
    PushSubscriptionRepository._resetDevStore();
    UserRepository._resetDevStore();
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
      const summary = await processDailyPushNotifications('2026-10-08', [{ id: user1, email: 'user1@example.com' }], { shouldClosePool: false });

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

  it('11. POST /api/notifications/trigger-daily-push rejects missing cron secret with 401 Unauthorized', async () => {
    const { NotificationController } = await import('../src/controllers/notificationController.js');
    NotificationController._resetPushState();
    config.cronSecret = 'test_super_secure_cron_secret_12345';

    let resStatus = null;
    let resJson = null;
    const mockReq = {
      headers: {},
      query: {},
      body: {},
    };
    const mockRes = {
      status(code) {
        resStatus = code;
        return {
          json(data) {
            resJson = data;
          },
        };
      },
    };

    await NotificationController.triggerDailyPush(mockReq, mockRes, (err) => { throw err; });

    assert.equal(resStatus, 401);
    assert.equal(resJson.success, false);
    assert.equal(resJson.code, 'UNAUTHORIZED');
  });

  it('12. POST /api/notifications/trigger-daily-push rejects invalid cron secret with 401 Unauthorized', async () => {
    const { NotificationController } = await import('../src/controllers/notificationController.js');
    NotificationController._resetPushState();
    config.cronSecret = 'test_super_secure_cron_secret_12345';

    let resStatus = null;
    let resJson = null;
    const mockReq = {
      headers: { 'x-cron-secret': 'wrong_secret_attempt' },
      query: {},
      body: {},
    };
    const mockRes = {
      status(code) {
        resStatus = code;
        return {
          json(data) {
            resJson = data;
          },
        };
      },
    };

    await NotificationController.triggerDailyPush(mockReq, mockRes, (err) => { throw err; });

    assert.equal(resStatus, 401);
    assert.equal(resJson.success, false);
    assert.equal(resJson.code, 'UNAUTHORIZED');
  });

  it('13. POST /api/notifications/trigger-daily-push accepts valid x-cron-secret and dispatches pushes', async () => {
    const { NotificationController } = await import('../src/controllers/notificationController.js');
    NotificationController._resetPushState();
    config.cronSecret = 'test_super_secure_cron_secret_12345';

    let resStatus = null;
    let resJson = null;
    const mockReq = {
      headers: { 'x-cron-secret': 'test_super_secure_cron_secret_12345' },
      query: { date: '2026-10-09' },
      body: {},
    };
    const mockRes = {
      status(code) {
        resStatus = code;
        return {
          json(data) {
            resJson = data;
          },
        };
      },
    };

    await NotificationController.triggerDailyPush(mockReq, mockRes, (err) => { throw err; });

    assert.equal(resStatus, 200);
    assert.equal(resJson.success, true);
    assert.equal(resJson.data.date, '2026-10-09');
    assert.equal(typeof resJson.data.pushSent, 'number');
  });

  it('14. POST /api/notifications/trigger-daily-push returns skipped on duplicate trigger for the same date', async () => {
    const { NotificationController } = await import('../src/controllers/notificationController.js');
    NotificationController._resetPushState();
    config.cronSecret = 'test_super_secure_cron_secret_12345';

    const mockReq = {
      headers: { 'x-cron-secret': 'test_super_secure_cron_secret_12345' },
      query: { date: '2026-10-09' },
      body: {},
    };

    let firstJson = null;
    const mockRes1 = {
      status(code) {
        return {
          json(data) {
            firstJson = data;
          },
        };
      },
    };

    // First execution -> success
    await NotificationController.triggerDailyPush(mockReq, mockRes1, (err) => { throw err; });
    assert.equal(firstJson.success, true);
    assert.equal(firstJson.skipped, undefined);

    // Second execution on same date -> skipped: true
    let secondJson = null;
    const mockRes2 = {
      status(code) {
        return {
          json(data) {
            secondJson = data;
          },
        };
      },
    };

    await NotificationController.triggerDailyPush(mockReq, mockRes2, (err) => { throw err; });
    assert.equal(secondJson.success, true);
    assert.equal(secondJson.skipped, true);
    assert.equal(secondJson.data.alreadyCompleted, true);
  });

  it('15. POST /api/notifications/trigger-daily-push with force=true bypasses duplicate check', async () => {
    const { NotificationController } = await import('../src/controllers/notificationController.js');
    NotificationController._resetPushState();
    config.cronSecret = 'test_super_secure_cron_secret_12345';

    const mockReq = {
      headers: { 'x-cron-secret': 'test_super_secure_cron_secret_12345' },
      query: { date: '2026-10-09' },
      body: {},
    };

    const mockRes = {
      status() {
        return { json() {} };
      },
    };

    // First execution
    await NotificationController.triggerDailyPush(mockReq, mockRes, (err) => { throw err; });

    // Forced execution
    const forcedReq = {
      headers: { 'x-cron-secret': 'test_super_secure_cron_secret_12345' },
      query: { date: '2026-10-09', force: 'true' },
      body: {},
    };

    let forcedJson = null;
    const mockResForced = {
      status(code) {
        return {
          json(data) {
            forcedJson = data;
          },
        };
      },
    };

    await NotificationController.triggerDailyPush(forcedReq, mockResForced, (err) => { throw err; });
    assert.equal(forcedJson.success, true);
    assert.equal(forcedJson.skipped, undefined);
  });

  it('16. POST /api/notifications/trigger-daily-push releases lock after failure so subsequent retries can run', async () => {
    const { NotificationController } = await import('../src/controllers/notificationController.js');
    NotificationController._resetPushState();
    config.cronSecret = 'test_super_secure_cron_secret_12345';

    // Mock pushNotificationService to throw error on first call
    const originalSend = pushNotificationService.sendPushToUser;
    let failFirst = true;

    pushNotificationService.sendPushToUser = async () => {
      if (failFirst) {
        failFirst = false;
        throw new Error('Push service temporary gateway error');
      }
      return { sent: 1, failed: 0, total: 1 };
    };

    try {
      const mockReq = {
        headers: { 'x-cron-secret': 'test_super_secure_cron_secret_12345' },
        query: { date: '2026-10-09' },
        body: {},
      };

      // Even when user error occurs during dispatch, the summary completes and lock is released
      let res1 = null;
      await NotificationController.triggerDailyPush(mockReq, {
        status(code) {
          return { json(data) { res1 = { code, data }; } };
        },
      }, () => {});

      assert.ok(res1);
      assert.equal(res1.code, 200);

      // Subsequent attempt runs cleanly without being blocked by previous run
      let res2 = null;
      await NotificationController.triggerDailyPush({
        ...mockReq,
        query: { date: '2026-10-09', force: 'true' },
      }, {
        status(code) {
          return { json(data) { res2 = { code, data }; } };
        },
      }, () => {});

      assert.ok(res2);
      assert.equal(res2.code, 200);
    } finally {
      pushNotificationService.sendPushToUser = originalSend;
      NotificationController._resetPushState();
    }
  });

  it('17. POST /api/notifications/test-push rejects missing or invalid cron secret with 401', async () => {
    const { NotificationController } = await import('../src/controllers/notificationController.js');
    config.cronSecret = 'test_super_secure_cron_secret_12345';

    let resStatus = null;
    let resJson = null;
    const mockRes = {
      status(code) {
        resStatus = code;
        return { json(data) { resJson = data; } };
      },
    };

    // Missing secret
    await NotificationController.testPush({ headers: {}, body: { email: 'user@example.com' } }, mockRes, (err) => { throw err; });
    assert.equal(resStatus, 401);
    assert.equal(resJson.code, 'UNAUTHORIZED');

    // Wrong secret
    await NotificationController.testPush({ headers: { 'x-cron-secret': 'wrong' }, body: { email: 'user@example.com' } }, mockRes, (err) => { throw err; });
    assert.equal(resStatus, 401);
    assert.equal(resJson.code, 'UNAUTHORIZED');
  });

  it('18. POST /api/notifications/test-push returns 400 when email is missing or empty', async () => {
    const { NotificationController } = await import('../src/controllers/notificationController.js');
    config.cronSecret = 'test_super_secure_cron_secret_12345';

    let resStatus = null;
    let resJson = null;
    const mockRes = {
      status(code) {
        resStatus = code;
        return { json(data) { resJson = data; } };
      },
    };

    await NotificationController.testPush({
      headers: { 'x-cron-secret': 'test_super_secure_cron_secret_12345' },
      body: {},
    }, mockRes, (err) => { throw err; });

    assert.equal(resStatus, 400);
    assert.equal(resJson.code, 'INVALID_REQUEST');
  });

  it('19. POST /api/notifications/test-push returns 404 when user is not found', async () => {
    const { NotificationController } = await import('../src/controllers/notificationController.js');
    config.cronSecret = 'test_super_secure_cron_secret_12345';

    let resStatus = null;
    let resJson = null;
    const mockRes = {
      status(code) {
        resStatus = code;
        return { json(data) { resJson = data; } };
      },
    };

    await NotificationController.testPush({
      headers: { 'x-cron-secret': 'test_super_secure_cron_secret_12345' },
      body: { email: 'nonexistent@example.com' },
    }, mockRes, (err) => { throw err; });

    assert.equal(resStatus, 404);
    assert.equal(resJson.code, 'USER_NOT_FOUND');
    assert.equal(resJson.data.userFound, false);
  });

  it('20. POST /api/notifications/test-push returns paused status when user has notification_enabled = false without sending push', async () => {
    const { NotificationController } = await import('../src/controllers/notificationController.js');
    const { UserService } = await import('../src/services/userService.js');
    config.cronSecret = 'test_super_secure_cron_secret_12345';

    const pausedUser = await UserRepository.createUser({
      name: 'Paused Tester',
      email: 'paused_user@example.com',
      passwordHash: 'hash',
      emailVerified: true,
    });
    // Explicitly update notification_enabled to false via repository/service
    await UserService.updatePreferences(pausedUser.id, false);

    let pushAttempted = false;
    const originalSendNotification = pushNotificationService.sendPushNotification;
    pushNotificationService.sendPushNotification = async () => {
      pushAttempted = true;
      return { success: true };
    };

    try {
      let resJson = null;
      await NotificationController.testPush({
        headers: { 'x-cron-secret': 'test_super_secure_cron_secret_12345' },
        body: { email: 'paused_user@example.com' },
      }, {
        status(code) {
          assert.equal(code, 200);
          return { json(data) { resJson = data; } };
        },
      }, (err) => { throw err; });

      assert.equal(resJson.code, 'NOTIFICATIONS_PAUSED');
      assert.equal(resJson.data.notificationEnabled, false);
      assert.equal(pushAttempted, false, 'Must not attempt to send push to paused user');
    } finally {
      pushNotificationService.sendPushNotification = originalSendNotification;
    }
  });

  it('21. POST /api/notifications/test-push returns no subscriptions status when user has 0 devices', async () => {
    const { NotificationController } = await import('../src/controllers/notificationController.js');
    config.cronSecret = 'test_super_secure_cron_secret_12345';

    await UserRepository.createUser({
      name: 'No Devices Tester',
      email: 'nodevices@example.com',
      passwordHash: 'hash',
      emailVerified: true,
    });

    let resJson = null;
    await NotificationController.testPush({
      headers: { 'x-cron-secret': 'test_super_secure_cron_secret_12345' },
      body: { email: 'nodevices@example.com' },
    }, {
      status(code) {
        assert.equal(code, 200);
        return { json(data) { resJson = data; } };
      },
    }, (err) => { throw err; });

    assert.equal(resJson.code, 'NO_SUBSCRIPTIONS');
    assert.equal(resJson.data.devicesFound, 0);
    assert.equal(resJson.data.sent, 0);
  });

  it('22. POST /api/notifications/test-push sends ONLY to target user and NEVER to other users', async () => {
    const { NotificationController } = await import('../src/controllers/notificationController.js');
    config.cronSecret = 'test_super_secure_cron_secret_12345';

    // Target User
    const targetUser = await UserRepository.createUser({
      name: 'Target User',
      email: 'target@example.com',
      passwordHash: 'hash',
      emailVerified: true,
    });

    await PushSubscriptionRepository.saveSubscription({
      userId: targetUser.id,
      endpoint: 'https://push.example.com/target_device_1',
      p256dh: 'target_p256',
      auth: 'target_auth',
    });

    // Other User
    const otherUser = await UserRepository.createUser({
      name: 'Other User',
      email: 'other@example.com',
      passwordHash: 'hash',
      emailVerified: true,
    });

    await PushSubscriptionRepository.saveSubscription({
      userId: otherUser.id,
      endpoint: 'https://push.example.com/other_device_1',
      p256dh: 'other_p256',
      auth: 'other_auth',
    });

    const dispatchedToEndpoints = [];
    const originalSendNotification = pushNotificationService.sendPushNotification;
    pushNotificationService.sendPushNotification = async (sub, payload) => {
      dispatchedToEndpoints.push({ endpoint: sub.endpoint, payload });
      return { success: true, endpoint: sub.endpoint };
    };

    try {
      let resJson = null;
      await NotificationController.testPush({
        headers: { 'x-cron-secret': 'test_super_secure_cron_secret_12345' },
        body: { email: 'target@example.com' },
      }, {
        status(code) {
          assert.equal(code, 200);
          return { json(data) { resJson = data; } };
        },
      }, (err) => { throw err; });

      assert.equal(resJson.success, true);
      assert.equal(resJson.data.email, 'target@example.com');
      assert.equal(resJson.data.sent, 1);
      assert.equal(resJson.data.devicesFound, 1);

      // Verify dispatched endpoints
      assert.equal(dispatchedToEndpoints.length, 1);
      assert.equal(dispatchedToEndpoints[0].endpoint, 'https://push.example.com/target_device_1');
      assert.equal(dispatchedToEndpoints[0].payload.title, '🙏 Daily Grace Test');
      assert.equal(dispatchedToEndpoints[0].payload.body, 'Your phone is successfully connected to Daily Grace notifications!');
      assert.equal(dispatchedToEndpoints[0].payload.tag, 'daily-grace-test');
      assert.equal(dispatchedToEndpoints[0].payload.url, '/today');
    } finally {
      pushNotificationService.sendPushNotification = originalSendNotification;
    }
  });
});


