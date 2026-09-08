import { query, isDatabaseAvailable } from '../config/db.js';
import { isValidUuid } from '../utils/cryptoUtils.js';
import { SAMPLE_MOTIVATIONS } from '../../seed/motivations.js';

// Development in-memory fallback store when PostgreSQL is offline
const devDailyAssignmentsStore = new Map(); // key: `${userId}:${assignedDate}`
const devMotivationsStore = new Map();

SAMPLE_MOTIVATIONS.forEach((item, index) => {
  const id = `mot_${index + 1}`;
  devMotivationsStore.set(id, {
    id,
    ...item,
    status: 'published',
    created_at: new Date(),
    updated_at: new Date(),
  });
});

export class DailyAssignmentRepository {
  /**
   * Find an existing daily motivation assignment for a user on a given date.
   */
  static async findAssignmentByUserAndDate(userId, assignedDate) {
    if (!userId) return null;

    if (!isDatabaseAvailable()) {
      const key = `${userId}:${assignedDate}`;
      const assignment = devDailyAssignmentsStore.get(key);
      if (!assignment) return null;

      const motivation = devMotivationsStore.get(assignment.motivation_id);
      if (!motivation) return null;

      return {
        id: motivation.id,
        title: motivation.title,
        verse: motivation.verse,
        reference: motivation.reference,
        reflection: motivation.reflection,
        prayer: motivation.prayer,
        status: motivation.status || 'published',
        day_number: motivation.day_number || null,
        assigned_date: assignment.assigned_date,
        cycle_number: assignment.cycle_number,
        is_completed: assignment.is_completed || false,
        completed_at: assignment.completed_at || null,
      };
    }

    if (!isValidUuid(userId)) return null;

    const text = `
      SELECT
        m.id,
        m.title,
        m.verse,
        m.reference,
        m.reflection,
        m.prayer,
        m.status,
        m.day_number,
        dm.assigned_date,
        dm.cycle_number,
        dm.is_completed,
        dm.completed_at
      FROM daily_motivations dm
      INNER JOIN motivations m ON dm.motivation_id = m.id
      WHERE dm.user_id = $1 AND dm.assigned_date = $2;
    `;
    const res = await query(text, [userId, assignedDate]);
    return res.rows[0] || null;
  }

  /**
   * Mark a daily motivation assignment as completed for a user on a given date.
   */
  static async markAssignmentCompleted(userId, assignedDate) {
    if (!userId) return null;

    if (!isDatabaseAvailable()) {
      const key = `${userId}:${assignedDate}`;
      const assignment = devDailyAssignmentsStore.get(key);
      if (assignment) {
        assignment.is_completed = true;
        assignment.completed_at = new Date();
        devDailyAssignmentsStore.set(key, assignment);
        return assignment;
      }
      return null;
    }

    if (!isValidUuid(userId)) return null;

    const text = `
      UPDATE daily_motivations
      SET is_completed = TRUE, completed_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND assigned_date = $2
      RETURNING id, user_id, motivation_id, assigned_date, cycle_number, is_completed, completed_at;
    `;
    const res = await query(text, [userId, assignedDate]);
    return res.rows[0] || null;
  }

  /**
   * Get the current cycle number for a user.
   */
  static async getUserCurrentCycle(userId) {
    if (!isDatabaseAvailable()) {
      let maxCycle = 1;
      for (const assignment of devDailyAssignmentsStore.values()) {
        if (assignment.user_id === userId && assignment.cycle_number > maxCycle) {
          maxCycle = assignment.cycle_number;
        }
      }
      return maxCycle;
    }

    if (!isValidUuid(userId)) return 1;

    const text = `
      SELECT COALESCE(MAX(cycle_number), 1) as current_cycle
      FROM daily_motivations
      WHERE user_id = $1;
    `;
    const res = await query(text, [userId]);
    return parseInt(res.rows[0]?.current_cycle || '1', 10);
  }

  /**
   * Find one unused motivation for a user within a specific cycle number.
   * STRICT: Only selects motivations with status = 'published' ordered sequentially by day_number.
   */
  static async findUnusedMotivationInCycle(userId, cycleNumber) {
    if (!isDatabaseAvailable()) {
      const assignedIds = new Set();
      for (const assignment of devDailyAssignmentsStore.values()) {
        if (assignment.user_id === userId && assignment.cycle_number === cycleNumber) {
          assignedIds.add(assignment.motivation_id);
        }
      }

      const available = [];
      for (const motivation of devMotivationsStore.values()) {
        if ((motivation.status || 'published') === 'published' && !assignedIds.has(motivation.id)) {
          available.push(motivation);
        }
      }
      available.sort((a, b) => (a.day_number || 999999) - (b.day_number || 999999));
      return available[0] ? { ...available[0] } : null;
    }

    if (!isValidUuid(userId)) return null;

    const text = `
      SELECT
        m.id,
        m.title,
        m.verse,
        m.reference,
        m.reflection,
        m.prayer,
        m.status,
        m.day_number
      FROM motivations m
      WHERE m.status = 'published'
        AND NOT EXISTS (
          SELECT 1
          FROM daily_motivations dm
          WHERE dm.motivation_id = m.id
            AND dm.user_id = $1
            AND dm.cycle_number = $2
        )
      ORDER BY COALESCE(m.day_number, 999999) ASC, m.created_at ASC, m.id ASC
      LIMIT 1;
    `;
    const res = await query(text, [userId, cycleNumber]);
    return res.rows[0] || null;
  }

  /**
   * Atomically create a daily assignment for a user on a given date.
   * Guarantees concurrency safety using UNIQUE(user_id, assigned_date) and ON CONFLICT DO NOTHING.
   */
  static async createDailyAssignment({ userId, motivationId, assignedDate, cycleNumber }) {
    if (!isDatabaseAvailable()) {
      const key = `${userId}:${assignedDate}`;
      if (!devDailyAssignmentsStore.has(key)) {
        const assignment = {
          id: `asg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          user_id: userId,
          motivation_id: motivationId,
          assigned_date: assignedDate,
          cycle_number: cycleNumber,
          created_at: new Date(),
        };
        devDailyAssignmentsStore.set(key, assignment);
      }
      return devDailyAssignmentsStore.get(key);
    }

    if (!isValidUuid(userId) || !isValidUuid(motivationId)) return null;

    const text = `
      INSERT INTO daily_motivations (user_id, motivation_id, assigned_date, cycle_number)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, assigned_date) DO NOTHING
      RETURNING id, user_id, motivation_id, assigned_date, cycle_number, created_at;
    `;
    const res = await query(text, [userId, motivationId, assignedDate, cycleNumber]);
    return res.rows[0] || null;
  }

  /**
   * Count how many daily user assignments reference a specific motivation.
   */
  static async countAssignmentsForMotivation(motivationId) {
    if (!isDatabaseAvailable()) {
      let count = 0;
      for (const asg of devDailyAssignmentsStore.values()) {
        if (asg.motivation_id === motivationId) {
          count++;
        }
      }
      return count;
    }

    if (!isValidUuid(motivationId)) return 0;

    const text = `SELECT COUNT(*)::int as count FROM daily_motivations WHERE motivation_id = $1;`;
    const res = await query(text, [motivationId]);
    return res.rows[0]?.count || 0;
  }

  /**
   * Get user assignment history.
   */
  static async getUserAssignmentHistory(userId, limit = 50) {
    if (!userId || !isValidUuid(userId)) return [];

    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));

    if (!isDatabaseAvailable()) {
      const history = [];
      for (const asg of devDailyAssignmentsStore.values()) {
        if (asg.user_id === userId) {
          const mot = devMotivationsStore.get(asg.motivation_id);
          if (mot) {
            history.push({
              ...mot,
              assigned_date: asg.assigned_date,
              cycle_number: asg.cycle_number,
            });
          }
        }
      }
      return history.slice(0, limitNum);
    }

    const text = `
      SELECT
        m.id,
        m.title,
        m.verse,
        m.reference,
        m.reflection,
        m.prayer,
        dm.assigned_date,
        dm.cycle_number,
        dm.created_at
      FROM daily_motivations dm
      INNER JOIN motivations m ON dm.motivation_id = m.id
      WHERE dm.user_id = $1
      ORDER BY dm.assigned_date DESC
      LIMIT $2;
    `;
    const res = await query(text, [userId, limitNum]);
    return res.rows;
  }

  /**
   * Delete user assignments (Reset Journey).
   */
  static async deleteUserAssignments(userId) {
    if (!isDatabaseAvailable()) {
      let deletedCount = 0;
      for (const [key, assignment] of devDailyAssignmentsStore.entries()) {
        if (assignment.user_id === userId) {
          devDailyAssignmentsStore.delete(key);
          deletedCount++;
        }
      }
      return deletedCount;
    }

    if (!isValidUuid(userId)) return 0;

    const text = `DELETE FROM daily_motivations WHERE user_id = $1;`;
    const res = await query(text, [userId]);
    return res.rowCount;
  }

  static _resetDevStore() {
    devDailyAssignmentsStore.clear();
  }
}
