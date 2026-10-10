import { query, isDatabaseAvailable } from '../config/db.js';
import { isValidUuid } from '../utils/cryptoUtils.js';

// Development in-memory fallback store when PostgreSQL is offline
const devSubscriptionsStore = new Map(); // key: endpoint -> subscription
const devPushLogsStore = new Map(); // key: `${userId}:${pushDate}` -> log

export class PushSubscriptionRepository {
  /**
   * Save or update a Web Push subscription.
   */
  static async saveSubscription({ userId, endpoint, p256dh, auth }) {
    if (!endpoint || !p256dh || !auth) {
      throw new Error('endpoint, p256dh, and auth are required for push subscription.');
    }

    if (!isDatabaseAvailable()) {
      const record = {
        id: `push_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId || null,
        endpoint,
        p256dh,
        auth,
        created_at: new Date(),
      };
      devSubscriptionsStore.set(endpoint, record);
      return record;
    }

    const cleanUserId = userId && isValidUuid(userId) ? userId : null;

    const text = `
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (endpoint) DO UPDATE
      SET user_id = EXCLUDED.user_id,
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          created_at = CURRENT_TIMESTAMP
      RETURNING id, user_id, endpoint, p256dh, auth, created_at;
    `;
    const res = await query(text, [cleanUserId, endpoint, p256dh, auth]);
    return res.rows[0];
  }

  /**
   * Find all active push subscriptions for a given user.
   */
  static async findSubscriptionsByUserId(userId) {
    if (!userId) return [];

    if (!isDatabaseAvailable()) {
      const results = [];
      for (const sub of devSubscriptionsStore.values()) {
        if (sub.user_id === userId) {
          results.push({ ...sub });
        }
      }
      return results;
    }

    if (!isValidUuid(userId)) return [];

    const text = `
      SELECT id, user_id, endpoint, p256dh, auth, created_at
      FROM push_subscriptions
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;
    const res = await query(text, [userId]);
    return res.rows;
  }

  /**
   * Find a specific push subscription by user ID and endpoint.
   */
  static async findSubscriptionByUserIdAndEndpoint(userId, endpoint) {
    if (!userId || !endpoint) return null;

    if (!isDatabaseAvailable()) {
      const sub = devSubscriptionsStore.get(endpoint);
      if (sub && sub.user_id === userId) {
        return { ...sub };
      }
      return null;
    }

    if (!isValidUuid(userId)) return null;

    const text = `
      SELECT id, user_id, endpoint, p256dh, auth, created_at
      FROM push_subscriptions
      WHERE user_id = $1 AND endpoint = $2;
    `;
    const res = await query(text, [userId, endpoint]);
    return res.rows[0] || null;
  }

  /**
   * Delete an invalid or unsubscribed endpoint.
   */
  static async deleteSubscriptionByEndpoint(endpoint) {
    if (!endpoint) return 0;

    if (!isDatabaseAvailable()) {
      const deleted = devSubscriptionsStore.delete(endpoint);
      return deleted ? 1 : 0;
    }

    const text = `DELETE FROM push_subscriptions WHERE endpoint = $1;`;
    const res = await query(text, [endpoint]);
    return res.rowCount;
  }

  /**
   * Find all users who have active push subscriptions and notification_enabled = true.
   * Includes each user's reminder_time and timezone.
   */
  static async findEligiblePushUsers() {
    if (!isDatabaseAvailable()) {
      const userMap = new Map();
      for (const sub of devSubscriptionsStore.values()) {
        if (sub.user_id && !userMap.has(sub.user_id)) {
          userMap.set(sub.user_id, {
            id: sub.user_id,
            name: 'Dev User',
            email: 'dev@dailygrace.app',
            notification_enabled: true,
            reminder_time: '05:00',
            timezone: 'Africa/Lagos',
          });
        }
      }
      return Array.from(userMap.values());
    }

    const text = `
      SELECT DISTINCT
        u.id,
        u.name,
        u.email,
        u.notification_enabled,
        COALESCE(u.reminder_time, '05:00') as reminder_time,
        COALESCE(u.timezone, 'Africa/Lagos') as timezone
      FROM users u
      INNER JOIN push_subscriptions ps ON ps.user_id = u.id
      WHERE u.notification_enabled = TRUE
      ORDER BY u.name ASC;
    `;
    const res = await query(text);
    return res.rows;
  }

  /**
   * Atomically claim a daily push notification slot for a user on a specific calendar date.
   * Database-backed idempotency prevents duplicate daily dispatches across restarts and cron retries.
   * @param {string} userId UUID of user
   * @param {string} pushDate YYYY-MM-DD
   * @param {string} [status='claimed']
   * @returns {Promise<Object|null>} returns claimed record if claimed, or null if already exists
   */
  static async claimDailyPush(userId, pushDate, status = 'claimed') {
    if (!userId || !pushDate) return null;

    if (!isDatabaseAvailable()) {
      const key = `${userId}:${pushDate}`;
      if (devPushLogsStore.has(key)) {
        return null; // Already claimed or sent
      }
      const record = {
        id: `plog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        push_date: pushDate,
        status,
        devices_targeted: 0,
        devices_sent: 0,
        devices_failed: 0,
        sent_at: new Date(),
      };
      devPushLogsStore.set(key, record);
      return record;
    }

    if (!isValidUuid(userId)) return null;

    const text = `
      INSERT INTO daily_push_logs (user_id, push_date, status)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, push_date) DO NOTHING
      RETURNING id, user_id, push_date, status, sent_at;
    `;
    const res = await query(text, [userId, pushDate, status]);
    return res.rows[0] || null;
  }

  /**
   * Update delivery counters and final status on a daily push log record.
   */
  static async updateDailyPushLog(userId, pushDate, { status = 'sent', devicesTargeted = 0, devicesSent = 0, devicesFailed = 0 } = {}) {
    if (!userId || !pushDate) return null;

    if (!isDatabaseAvailable()) {
      const key = `${userId}:${pushDate}`;
      const existing = devPushLogsStore.get(key) || { user_id: userId, push_date: pushDate };
      existing.status = status;
      existing.devices_targeted = devicesTargeted;
      existing.devices_sent = devicesSent;
      existing.devices_failed = devicesFailed;
      existing.sent_at = new Date();
      devPushLogsStore.set(key, existing);
      return existing;
    }

    if (!isValidUuid(userId)) return null;

    const text = `
      UPDATE daily_push_logs
      SET
        status = $1,
        devices_targeted = $2,
        devices_sent = $3,
        devices_failed = $4,
        sent_at = CURRENT_TIMESTAMP
      WHERE user_id = $5 AND push_date = $6
      RETURNING id, user_id, push_date, status, devices_targeted, devices_sent, devices_failed, sent_at;
    `;
    const res = await query(text, [status, devicesTargeted, devicesSent, devicesFailed, userId, pushDate]);
    return res.rows[0] || null;
  }

  /**
   * Check whether a user has already received a daily push on a given calendar date.
   */
  static async hasReceivedPushToday(userId, pushDate) {
    if (!userId || !pushDate) return false;

    if (!isDatabaseAvailable()) {
      const key = `${userId}:${pushDate}`;
      const log = devPushLogsStore.get(key);
      return Boolean(log && log.status === 'sent');
    }

    if (!isValidUuid(userId)) return false;

    const text = `
      SELECT id, status FROM daily_push_logs
      WHERE user_id = $1 AND push_date = $2;
    `;
    const res = await query(text, [userId, pushDate]);
    return res.rows.length > 0;
  }

  /**
   * Reset dev store for unit test isolation.
   */
  static _resetDevStore() {
    devSubscriptionsStore.clear();
    devPushLogsStore.clear();
  }
}
