/**
 * Validates a single motivation object.
 * Required fields:
 * - title: non-empty string
 * - verse: non-empty string
 * - reference: non-empty string
 * - reflection: non-empty string
 * - prayer: non-empty string
 *
 * @param {Object} item Raw record
 * @param {number|string} identifier Index or identifier for error reporting
 * @returns {{ isValid: boolean, sanitized?: Object, errors: string[] }}
 */
export function validateMotivationRecord(item, identifier = 0) {
  const errors = [];

  if (!item || typeof item !== 'object') {
    return {
      isValid: false,
      errors: [`Record #${identifier}: Must be a valid JSON object.`],
    };
  }

  const fields = ['title', 'verse', 'reference', 'reflection', 'prayer'];
  const sanitized = {};

  for (const field of fields) {
    const value = item[field];
    if (typeof value !== 'string' || !value.trim()) {
      errors.push(`Record #${identifier}: Missing or empty required field '${field}'.`);
    } else {
      sanitized[field] = value.trim();
    }
  }

  return {
    isValid: errors.length === 0,
    sanitized: errors.length === 0 ? sanitized : null,
    errors,
  };
}
