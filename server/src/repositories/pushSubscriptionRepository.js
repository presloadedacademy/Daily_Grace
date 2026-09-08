import { query, isDatabaseAvailable } from '../config/db.js';
import { isValidUuid } from '../utils/cryptoUtils.js';

// Development in-memory fallback store when PostgreSQL is offline
const devSubscriptionsStore = new Map(); // key: endpoint -> subscription

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
   * Reset dev store for unit test isolation.
   */
  static _resetDevStore() {
    devSubscriptionsStore.clear();
  }
}
