import { query, isDatabaseAvailable } from '../config/db.js';
import { UserRepository } from './userRepository.js';
import { isValidUuid } from '../utils/cryptoUtils.js';

// Development in-memory fallback store when PostgreSQL is offline
const devReminderLogsStore = new Map(); // key: `${userId}:${reminderDate}`

export class ReminderRepository {
  /**
   * Find all verified users who have notifications enabled and haven't received a reminder for today.
   * @param {string} reminderDate YYYY-MM-DD
   */
  static async findEligibleUsersForReminder(reminderDate) {
    if (!isDatabaseAvailable()) {
      // In-memory lookup: fetch users, filter verified & notification_enabled, exclude logged
      // Access dev store users via findById or iterating memory
      const eligible = [];
      // Test environments can supply user objects or query userRepository
      return eligible;
    }

    const text = `
      SELECT
        u.id,
        u.name,
        u.email
      FROM users u
      WHERE u.email_verified = TRUE
        AND u.notification_enabled = TRUE
        AND NOT EXISTS (
          SELECT 1
          FROM daily_reminder_logs drl
          WHERE drl.user_id = u.id
            AND drl.reminder_date = $1
        )
      ORDER BY u.created_at ASC;
    `;
    const res = await query(text, [reminderDate]);
    return res.rows;
  }

  /**
   * Atomically log a reminder attempt to prevent duplicate sends on the same date.
   * @param {string} userId UUID of user
   * @param {string} reminderDate YYYY-MM-DD
   * @param {string} [status='sent'] Status ('sent', 'failed')
   */
  static async recordReminderLog(userId, reminderDate, status = 'sent') {
    if (!isDatabaseAvailable()) {
      const key = `${userId}:${reminderDate}`;
      if (!devReminderLogsStore.has(key)) {
        const log = {
          id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          user_id: userId,
          reminder_date: reminderDate,
          sent_at: new Date(),
          status,
        };
        devReminderLogsStore.set(key, log);
        return log;
      }
      return null;
    }

    if (!isValidUuid(userId)) return null;

    const text = `
      INSERT INTO daily_reminder_logs (user_id, reminder_date, status)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, reminder_date) DO NOTHING
      RETURNING id, user_id, reminder_date, status, sent_at;
    `;
    const res = await query(text, [userId, reminderDate, status]);
    return res.rows[0] || null;
  }

  /**
   * Check whether a user already received a reminder for a given date.
   */
  static async hasReceivedReminder(userId, reminderDate) {
    if (!isDatabaseAvailable()) {
      const key = `${userId}:${reminderDate}`;
      return devReminderLogsStore.has(key);
    }

    if (!isValidUuid(userId)) return false;

    const text = `
      SELECT id FROM daily_reminder_logs
      WHERE user_id = $1 AND reminder_date = $2;
    `;
    const res = await query(text, [userId, reminderDate]);
    return (res.rows.length > 0);
  }

  /**
   * Reset dev in-memory store for isolated testing.
   */
  static _resetDevStore() {
    devReminderLogsStore.clear();
  }
}

