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
      connectionTimeoutMillis: 4000,
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
