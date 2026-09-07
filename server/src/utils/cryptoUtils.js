import crypto from 'crypto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate whether a string is a valid UUID format.
 * @param {string} id
 * @returns {boolean}
 */
export function isValidUuid(id) {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id.trim());
}

/**
 * Generate a standard RFC4122 v4 UUID.
 * @returns {string}
 */
export function generateUuid() {
  return crypto.randomUUID();
}

/**
 * Generate a cryptographically secure random token (hex string).
 * @param {number} bytes Length in bytes (default 32)
 * @returns {string} Hex encoded random token
 */
export function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Compute SHA-256 hash of a string (such as a verification token).
 * We store only the hash in the database to protect against database leaks.
 * @param {string} token Raw token string
 * @returns {string} SHA-256 hex digest
 */
export function hashToken(token) {
  if (!token) return null;
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

