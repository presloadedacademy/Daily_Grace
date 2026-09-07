import { query, isDatabaseAvailable } from '../config/db.js';
import { SAMPLE_MOTIVATIONS } from '../../seed/motivations.js';
import { isValidUuid } from '../utils/cryptoUtils.js';
import { DailyAssignmentRepository } from './dailyAssignmentRepository.js';

// Development in-memory fallback stores when PostgreSQL is offline
const devMotivationsStore = new Map();

// Initialize in-memory store with development sample data (default status 'published')
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

export class MotivationRepository {
  /**
   * Find an existing daily motivation assignment for a user on a given date.
   */
  static async findAssignmentByUserAndDate(userId, assignedDate) {
    return DailyAssignmentRepository.findAssignmentByUserAndDate(userId, assignedDate);
  }

  /**
   * Get the current cycle number for a user.
   */
  static async getUserCurrentCycle(userId) {
    return DailyAssignmentRepository.getUserCurrentCycle(userId);
  }

  /**
   * Find one unused motivation for a user within a specific cycle number.
   * STRICT REQUIREMENT: Only select motivations with status = 'published'.
   */
  static async findUnusedMotivationInCycle(userId, cycleNumber) {
    return DailyAssignmentRepository.findUnusedMotivationInCycle(userId, cycleNumber);
  }



  /**
   * Find a motivation by primary key ID.
   */
  static async findById(id) {
    if (!id) return null;

    if (!isDatabaseAvailable()) {
      const m = devMotivationsStore.get(id);
      return m ? { ...m } : null;
    }

    if (!isValidUuid(id)) return null;

    const text = `
      SELECT id, title, verse, reference, reflection, prayer, status, created_at, updated_at
      FROM motivations
      WHERE id = $1;
    `;
    const res = await query(text, [id]);
    return res.rows[0] || null;
  }


  /**
   * Create a single motivation.
   */
  static async createMotivation({ title, verse, reference, reflection, prayer, status = 'draft' }) {
    const cleanStatus = status === 'published' ? 'published' : 'draft';

    if (!isDatabaseAvailable()) {
      const id = `mot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const m = {
        id,
        title: title.trim(),
        verse: verse.trim(),
        reference: reference.trim(),
        reflection: reflection.trim(),
        prayer: prayer.trim(),
        status: cleanStatus,
        created_at: new Date(),
        updated_at: new Date(),
      };
      devMotivationsStore.set(id, m);
      return m;
    }

    const text = `
      INSERT INTO motivations (title, verse, reference, reflection, prayer, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, title, verse, reference, reflection, prayer, status, created_at, updated_at;
    `;
    const res = await query(text, [
      title.trim(),
      verse.trim(),
      reference.trim(),
      reflection.trim(),
      prayer.trim(),
      cleanStatus,
    ]);
    return res.rows[0];
  }

  /**
   * Update an existing motivation.
   */
  static async updateMotivation(id, { title, verse, reference, reflection, prayer, status }) {
    if (!isDatabaseAvailable()) {
      const m = devMotivationsStore.get(id);
      if (!m) return null;

      if (title !== undefined) m.title = title.trim();
      if (verse !== undefined) m.verse = verse.trim();
      if (reference !== undefined) m.reference = reference.trim();
      if (reflection !== undefined) m.reflection = reflection.trim();
      if (prayer !== undefined) m.prayer = prayer.trim();
      if (status !== undefined) m.status = status === 'published' ? 'published' : 'draft';
      m.updated_at = new Date();

      return { ...m };
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(title.trim());
    }
    if (verse !== undefined) {
      fields.push(`verse = $${idx++}`);
      values.push(verse.trim());
    }
    if (reference !== undefined) {
      fields.push(`reference = $${idx++}`);
      values.push(reference.trim());
    }
    if (reflection !== undefined) {
      fields.push(`reflection = $${idx++}`);
      values.push(reflection.trim());
    }
    if (prayer !== undefined) {
      fields.push(`prayer = $${idx++}`);
      values.push(prayer.trim());
    }
    if (status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(status === 'published' ? 'published' : 'draft');
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const text = `
      UPDATE motivations
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, title, verse, reference, reflection, prayer, status, created_at, updated_at;
    `;
    const res = await query(text, values);
    return res.rows[0] || null;
  }

  /**
   * Count how many daily user assignments reference a specific motivation.
   */
  static async countAssignmentsForMotivation(motivationId) {
    return DailyAssignmentRepository.countAssignmentsForMotivation(motivationId);
  }

  /**
   * Permanently delete a motivation from the database.
   */
  static async deleteMotivation(id) {
    if (!isDatabaseAvailable()) {
      return devMotivationsStore.delete(id);
    }

    const text = `DELETE FROM motivations WHERE id = $1 RETURNING id;`;
    const res = await query(text, [id]);
    return res.rowCount > 0;
  }

  /**
   * Create a daily assignment for a user on a given date.
   */
  static async createDailyAssignment({ userId, motivationId, assignedDate, cycleNumber }) {
    return DailyAssignmentRepository.createDailyAssignment({ userId, motivationId, assignedDate, cycleNumber });
  }



  /**
   * Count total published motivations in the database.
   */
  static async countTotalPublishedMotivations() {
    if (!isDatabaseAvailable()) {
      let count = 0;
      for (const m of devMotivationsStore.values()) {
        if ((m.status || 'published') === 'published') count++;
      }
      return count;
    }

    const text = `SELECT COUNT(*)::int as total FROM motivations WHERE status = 'published';`;
    const res = await query(text);
    return res.rows[0]?.total || 0;
  }

  /**
   * Count total motivations in the database.
   */
  static async countTotalMotivations() {
    if (!isDatabaseAvailable()) {
      return devMotivationsStore.size;
    }

    const text = `SELECT COUNT(*)::int as total FROM motivations;`;
    const res = await query(text);
    return res.rows[0]?.total || 0;
  }

  /**
   * Admin paginated query with search and status filtering.
   */
  static async adminListMotivations({ page = 1, limit = 20, q = '', status = 'all' }) {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    if (!isDatabaseAvailable()) {
      let list = Array.from(devMotivationsStore.values());

      // Filter status
      if (status && status !== 'all') {
        list = list.filter((m) => (m.status || 'published') === status);
      }

      // Search query
      if (q && q.trim()) {
        const queryLower = q.trim().toLowerCase();
        list = list.filter(
          (m) =>
            (m.title && m.title.toLowerCase().includes(queryLower)) ||
            (m.reference && m.reference.toLowerCase().includes(queryLower)) ||
            (m.reflection && m.reflection.toLowerCase().includes(queryLower))
        );
      }

      const total = list.length;
      const totalPages = Math.ceil(total / limitNum) || 1;
      const paginated = list.slice(offset, offset + limitNum);

      return {
        data: paginated,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      };
    }

    const conditions = [];
    const values = [];
    let idx = 1;

    if (status && status !== 'all') {
      conditions.push(`status = $${idx++}`);
      values.push(status);
    }

    if (q && q.trim()) {
      conditions.push(`(LOWER(title) LIKE $${idx} OR LOWER(reference) LIKE $${idx} OR LOWER(reflection) LIKE $${idx})`);
      values.push(`%${q.trim().toLowerCase()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const countSql = `SELECT COUNT(*)::int as total FROM motivations ${whereClause};`;
    const countRes = await query(countSql, values);
    const total = countRes.rows[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    // Data query
    const dataSql = `
      SELECT id, title, verse, reference, reflection, prayer, status, created_at, updated_at
      FROM motivations
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;
    const dataValues = [...values, limitNum, offset];
    const dataRes = await query(dataSql, dataValues);

    return {
      data: dataRes.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get administrative content statistics.
   */
  static async getAdminStats() {
    if (!isDatabaseAvailable()) {
      let totalMotivations = devMotivationsStore.size;
      let publishedMotivations = 0;
      let draftMotivations = 0;

      for (const m of devMotivationsStore.values()) {
        if ((m.status || 'published') === 'published') publishedMotivations++;
        else draftMotivations++;
      }

      return {
        totalMotivations,
        publishedMotivations,
        draftMotivations,
      };
    }

    const text = `
      SELECT
        COUNT(*)::int as total_motivations,
        COUNT(CASE WHEN status = 'published' THEN 1 END)::int as published_motivations,
        COUNT(CASE WHEN status = 'draft' THEN 1 END)::int as draft_motivations
      FROM motivations;
    `;
    const res = await query(text);
    const row = res.rows[0];
    return {
      totalMotivations: row?.total_motivations || 0,
      publishedMotivations: row?.published_motivations || 0,
      draftMotivations: row?.draft_motivations || 0,
    };
  }

  /**
   * Get recently created/updated motivations for the dashboard.
   */
  static async getRecentMotivations(limit = 5) {
    const limitNum = Math.max(1, Math.min(20, parseInt(limit, 10)));

    if (!isDatabaseAvailable()) {
      const list = Array.from(devMotivationsStore.values());
      list.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
      return list.slice(0, limitNum);
    }

    const text = `
      SELECT id, title, verse, reference, reflection, prayer, status, created_at, updated_at
      FROM motivations
      ORDER BY updated_at DESC, created_at DESC
      LIMIT $1;
    `;
    const res = await query(text, [limitNum]);
    return res.rows;
  }

  /**
   * Get today's featured / latest published motivation for dashboard overview.
   */
  static async getTodaysFeaturedMotivation() {
    if (!isDatabaseAvailable()) {
      for (const m of devMotivationsStore.values()) {
        if ((m.status || 'published') === 'published') {
          return { ...m };
        }
      }
      return null;
    }

    const text = `
      SELECT id, title, verse, reference, reflection, prayer, status, created_at, updated_at
      FROM motivations
      WHERE status = 'published'
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1;
    `;
    const res = await query(text);
    return res.rows[0] || null;
  }


  /**
   * Delete user assignments (Reset Journey).
   */
  static async deleteUserAssignments(userId) {
    return DailyAssignmentRepository.deleteUserAssignments(userId);
  }

  /**
   * Bulk insert multiple motivations in batches.
   */
  static async bulkInsertMotivations(motivationsList, status = 'published') {
    if (!motivationsList || motivationsList.length === 0) return 0;

    if (!isDatabaseAvailable()) {
      motivationsList.forEach((item, index) => {
        const id = `mot_${Date.now()}_${index}`;
        devMotivationsStore.set(id, {
          id,
          ...item,
          status: item.status || status,
          created_at: new Date(),
          updated_at: new Date(),
        });
      });
      return motivationsList.length;
    }

    const BATCH_SIZE = 1000;
    let totalInserted = 0;

    for (let i = 0; i < motivationsList.length; i += BATCH_SIZE) {
      const batch = motivationsList.slice(i, i + BATCH_SIZE);
      const valuePlaceholders = [];
      const values = [];

      batch.forEach((item, index) => {
        const offset = index * 6;
        valuePlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`);
        values.push(
          item.title,
          item.verse,
          item.reference,
          item.reflection,
          item.prayer,
          item.status || status
        );
      });

      const text = `
        INSERT INTO motivations (title, verse, reference, reflection, prayer, status)
        VALUES ${valuePlaceholders.join(', ')}
        RETURNING id;
      `;
      const res = await query(text, values);
      totalInserted += res.rowCount;
    }

    return totalInserted;
  }

  static _resetDevStore() {
    DailyAssignmentRepository._resetDevStore();
  }
}

