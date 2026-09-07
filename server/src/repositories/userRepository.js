import { query, isDatabaseAvailable } from '../config/db.js';
import { isValidUuid, generateUuid } from '../utils/cryptoUtils.js';

// Development in-memory fallback store when PostgreSQL is offline
const devMemoryStore = new Map();

export class UserRepository {
  /**
   * Reset dev in-memory store for isolated testing.
   */
  static _resetDevStore() {
    devMemoryStore.clear();
  }

  /**
   * Create a new user record (defaults role to 'user', email_verified to false).
   */
  static async createUser({
    name,
    email,
    passwordHash,
    verificationTokenHash = null,
    verificationTokenExpiresAt = null,
    emailVerified = false,
    role = 'user',
  }) {
    const normalizedEmail = email.trim().toLowerCase();
    const assignedRole = role === 'admin' || normalizedEmail === 'admindailygrace@gmail.com' ? 'admin' : 'user';
    const isVerified = Boolean(emailVerified);


    if (!isDatabaseAvailable()) {
      const user = {
        id: generateUuid(),
        name: name.trim(),
        email: normalizedEmail,
        password_hash: passwordHash,
        role: assignedRole,
        email_verified: isVerified,
        notification_enabled: true,
        onboarding_completed: false,
        verification_token_hash: verificationTokenHash,
        verification_token_expires_at: verificationTokenExpiresAt,
        created_at: new Date(),
        updated_at: new Date(),
      };
      devMemoryStore.set(user.id, user);
      return user;
    }

    const userId = generateUuid();

    const text = `
  INSERT INTO users (
    id,
    name,
    email,
    password_hash,
    role,
    email_verified,
    notification_enabled,
    onboarding_completed,
    verification_token_hash,
    verification_token_expires_at
  )
  VALUES ($1, $2, LOWER($3), $4, $5, $6, TRUE, FALSE, $7, $8)
  RETURNING id, name, email, role, email_verified, notification_enabled, onboarding_completed, created_at, updated_at;
`;

    const values = [
      userId,
      name.trim(),
      normalizedEmail,
      passwordHash,
      assignedRole,
      isVerified,
      verificationTokenHash,
      verificationTokenExpiresAt,
    ];

    const res = await query(text, values);
    return res.rows[0];
  }

  /**
   * Find a user by email (case-insensitive).
   */
  static async findByEmail(email) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();

    if (!isDatabaseAvailable()) {
      for (const u of devMemoryStore.values()) {
        if (u.email.toLowerCase() === normalized) {
          return { ...u };
        }
      }
      return null;
    }

    const text = `
      SELECT
        id,
        name,
        email,
        password_hash,
        role,
        email_verified,
        notification_enabled,
        onboarding_completed,
        verification_token_hash,
        verification_token_expires_at,
        created_at,
        updated_at
      FROM users
      WHERE LOWER(email) = LOWER($1);
    `;
    const res = await query(text, [normalized]);
    return res.rows[0] || null;
  }

  /**
   * Find a user by primary key ID.
   */
  static async findById(id) {
    if (!id || !isValidUuid(id)) return null;

    if (!isDatabaseAvailable()) {
      const u = devMemoryStore.get(id);
      return u ? { ...u } : null;
    }

    const text = `
      SELECT
        id,
        name,
        email,
        role,
        email_verified,
        notification_enabled,
        onboarding_completed,
        created_at,
        updated_at
      FROM users
      WHERE id = $1;
    `;
    const res = await query(text, [id]);
    return res.rows[0] || null;
  }


  /**
   * Find a user by their verification token hash.
   */
  static async findByVerificationTokenHash(tokenHash) {
    if (!tokenHash) return null;

    if (!isDatabaseAvailable()) {
      for (const u of devMemoryStore.values()) {
        if (u.verification_token_hash === tokenHash) {
          return { ...u };
        }
      }
      return null;
    }

    const text = `
      SELECT
        id,
        name,
        email,
        role,
        email_verified,
        notification_enabled,
        verification_token_hash,
        verification_token_expires_at
      FROM users
      WHERE verification_token_hash = $1;
    `;
    const res = await query(text, [tokenHash]);
    return res.rows[0] || null;
  }

  /**
   * Mark user's email as verified and invalidate token.
   */
  static async markEmailVerified(userId) {
    if (!userId || !isValidUuid(userId)) return null;

    if (!isDatabaseAvailable()) {
      const u = devMemoryStore.get(userId);
      if (u) {
        u.email_verified = true;
        u.verification_token_hash = null;
        u.verification_token_expires_at = null;
        u.updated_at = new Date();
        return { ...u };
      }
      return null;
    }

    const text = `
      UPDATE users
      SET
        email_verified = TRUE,
        verification_token_hash = NULL,
        verification_token_expires_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, name, email, role, email_verified, notification_enabled, updated_at;
    `;
    const res = await query(text, [userId]);
    return res.rows[0] || null;
  }

  /**
   * Update verification token and expiration.
   */
  static async updateVerificationToken(userId, tokenHash, expiresAt) {
    if (!userId || !isValidUuid(userId)) return null;

    if (!isDatabaseAvailable()) {
      const u = devMemoryStore.get(userId);
      if (u) {
        u.verification_token_hash = tokenHash;
        u.verification_token_expires_at = expiresAt;
        u.updated_at = new Date();
        return { ...u };
      }
      return null;
    }

    const text = `
      UPDATE users
      SET
        verification_token_hash = $1,
        verification_token_expires_at = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, name, email, role, email_verified, notification_enabled;
    `;
    const res = await query(text, [tokenHash, expiresAt, userId]);
    return res.rows[0] || null;
  }

  /**
   * Update user profile name.
   */
  static async updateProfile(userId, { name }) {
    if (!userId || !isValidUuid(userId)) return null;

    if (!isDatabaseAvailable()) {
      const u = devMemoryStore.get(userId);
      if (u) {
        u.name = name.trim();
        u.updated_at = new Date();
        return { ...u };
      }
      return null;
    }

    const text = `
      UPDATE users
      SET
        name = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, email, role, email_verified, notification_enabled, onboarding_completed, updated_at;
    `;
    const res = await query(text, [name.trim(), userId]);
    return res.rows[0] || null;
  }

  /**
   * Update user notification preference.
   */
  static async updatePreferences(userId, { notificationEnabled }) {
    if (!userId || !isValidUuid(userId)) return null;

    if (!isDatabaseAvailable()) {
      const u = devMemoryStore.get(userId);
      if (u) {
        u.notification_enabled = Boolean(notificationEnabled);
        u.updated_at = new Date();
        return { ...u };
      }
      return null;
    }

    const text = `
      UPDATE users
      SET
        notification_enabled = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, email, role, email_verified, notification_enabled, onboarding_completed, updated_at;
    `;
    const res = await query(text, [Boolean(notificationEnabled), userId]);
    return res.rows[0] || null;
  }

  /**
   * Update onboarding completion status.
   */
  static async updateOnboardingStatus(userId, completed = true) {
    if (!userId || !isValidUuid(userId)) return null;

    if (!isDatabaseAvailable()) {
      const u = devMemoryStore.get(userId);
      if (u) {
        u.onboarding_completed = Boolean(completed);
        u.updated_at = new Date();
        return { ...u };
      }
      return null;
    }

    const text = `
      UPDATE users
      SET
        onboarding_completed = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, email, role, email_verified, notification_enabled, onboarding_completed, updated_at;
    `;
    const res = await query(text, [Boolean(completed), userId]);
    return res.rows[0] || null;
  }


  /**
   * Set user role (e.g. promote to 'admin').
   */
  static async setRole(userId, role) {
    if (!userId || !isValidUuid(userId)) return null;

    if (!isDatabaseAvailable()) {
      const u = devMemoryStore.get(userId);
      if (u) {
        u.role = role;
        u.updated_at = new Date();
        return { ...u };
      }
      return null;
    }

    const text = `
      UPDATE users
      SET
        role = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, email, role, email_verified, notification_enabled;
    `;
    const res = await query(text, [role, userId]);
    return res.rows[0] || null;
  }

  /**
   * Update password hash.
   */
  static async updatePasswordHash(userId, passwordHash) {
    if (!userId || !isValidUuid(userId)) return null;

    if (!isDatabaseAvailable()) {
      const u = devMemoryStore.get(userId);
      if (u) {
        u.password_hash = passwordHash;
        u.updated_at = new Date();
        return { ...u };
      }
      return null;
    }

    const text = `
      UPDATE users
      SET
        password_hash = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, email, role, email_verified;
    `;
    const res = await query(text, [passwordHash, userId]);
    return res.rows[0] || null;
  }


  /**
   * Count total registered users in the database.
   */
  static async countTotalUsers() {
    if (!isDatabaseAvailable()) {
      return devMemoryStore.size;
    }

    const text = `SELECT COUNT(*)::int as total FROM users;`;
    const res = await query(text);
    return res.rows[0]?.total || 0;
  }

  /**
   * Count total admin users in the database.
   */
  static async countTotalAdmins() {
    if (!isDatabaseAvailable()) {
      let count = 0;
      for (const u of devMemoryStore.values()) {
        if (u.role === 'admin') count++;
      }
      return count;
    }

    const text = `SELECT COUNT(*)::int as total FROM users WHERE role = 'admin';`;
    const res = await query(text);
    return res.rows[0]?.total || 0;
  }

  /**
   * Admin paginated user list with search and role filter.
   * NEVER returns password hashes or verification token secrets.
   */
  static async adminListUsers({ page = 1, limit = 20, q = '', role = 'all' }) {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    if (!isDatabaseAvailable()) {
      let list = Array.from(devMemoryStore.values()).map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role || 'user',
        email_verified: Boolean(u.email_verified),
        notification_enabled: Boolean(u.notification_enabled),
        created_at: u.created_at,
        updated_at: u.updated_at,
      }));

      if (role && role !== 'all') {
        list = list.filter((u) => u.role === role);
      }

      if (q && q.trim()) {
        const queryLower = q.trim().toLowerCase();
        list = list.filter(
          (u) =>
            (u.name && u.name.toLowerCase().includes(queryLower)) ||
            (u.email && u.email.toLowerCase().includes(queryLower))
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

    if (role && role !== 'all') {
      conditions.push(`role = $${idx++}`);
      values.push(role);
    }

    if (q && q.trim()) {
      conditions.push(`(LOWER(name) LIKE $${idx} OR LOWER(email) LIKE $${idx})`);
      values.push(`%${q.trim().toLowerCase()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*)::int as total FROM users ${whereClause};`;
    const countRes = await query(countSql, values);
    const total = countRes.rows[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    const dataSql = `
      SELECT id, name, email, role, email_verified, notification_enabled, created_at, updated_at
      FROM users
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
   * Find user with password_hash strictly for internal auth / password change checks.
   */
  static async findAuthUserById(id) {
    if (!id || !isValidUuid(id)) return null;

    if (!isDatabaseAvailable()) {
      const u = devMemoryStore.get(id);
      return u ? { ...u } : null;
    }

    const text = `
      SELECT id, name, email, password_hash, role, email_verified, notification_enabled, created_at, updated_at
      FROM users
      WHERE id = $1;
    `;
    const res = await query(text, [id]);
    return res.rows[0] || null;
  }
}


