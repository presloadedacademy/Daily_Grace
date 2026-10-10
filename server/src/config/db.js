import pkg from 'pg';
const { Pool } = pkg;
import { config } from './env.js';

let pool;
let isDbOnline = false;

export function isDatabaseAvailable() {
  return isDbOnline;
}

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('[DB] Unexpected database error on idle client:', err.message);
    });
  }
  return pool;
}

export async function query(text, params) {
  const p = getPool();
  const start = Date.now();
  try {
    const res = await p.query(text, params);
    const duration = Date.now() - start;
    if (config.nodeEnv === 'development' && process.env.DEBUG_SQL === 'true') {
      console.log(`[DB Query] ${text} [${duration}ms]`);
    }
    return res;
  } catch (err) {
    console.error('[DB Query Error]', { text, error: err.message });
    throw err;
  }
}

export async function checkDbConnection() {
  try {
    const res = await query('SELECT NOW() as current_time');
    isDbOnline = true;
    console.log(`[DB] Connected to PostgreSQL successfully at ${res.rows[0].current_time}`);

    // Auto-migrate any missing columns and idempotency tables
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_otp VARCHAR(6);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_otp_expires_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_time VARCHAR(5) NOT NULL DEFAULT '05:00';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) NOT NULL DEFAULT 'Africa/Lagos';
      CREATE INDEX IF NOT EXISTS idx_users_reminder_time ON users(reminder_time);

      CREATE TABLE IF NOT EXISTS daily_push_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          push_date DATE NOT NULL,
          sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'sent',
          devices_targeted INTEGER NOT NULL DEFAULT 0,
          devices_sent INTEGER NOT NULL DEFAULT 0,
          devices_failed INTEGER NOT NULL DEFAULT 0,
          CONSTRAINT uq_user_push_date UNIQUE (user_id, push_date)
      );
      CREATE INDEX IF NOT EXISTS idx_daily_push_logs_date ON daily_push_logs(push_date);
      CREATE INDEX IF NOT EXISTS idx_daily_push_logs_user_date ON daily_push_logs(user_id, push_date);
    `).catch((err) => {
      console.warn('[DB Migration Warning]', err.message);
    });

    return true;
  } catch (err) {
    isDbOnline = false;
    console.warn(`[DB] PostgreSQL is offline or unreachable (${err.message || 'Connection refused'}). Falling back to in-memory store for development.`);
    return false;
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
