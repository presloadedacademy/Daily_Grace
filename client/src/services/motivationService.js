import { api } from './api.js';

class MotivationService {
  /**
   * Helper to format current date in Lagos timezone (YYYY-MM-DD) for client requests
   */
  getLagosDateString(customDate = null) {
    if (customDate) return customDate;
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Lagos',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(new Date());
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  /**
   * Fetch today's assigned scripture, reflection, and prayer for the authenticated user.
   * Query includes today's date and cache-busting headers to prevent stale browser / service-worker caching.
   */
  async getTodaysMotivation(customDate = null) {
    const todayStr = this.getLagosDateString(customDate);
    const timestamp = Date.now();
    const endpoint = `/api/motivations/today?date=${encodeURIComponent(todayStr)}&_t=${timestamp}`;

    const response = await api.request(endpoint, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    return response.data;
  }

  /**
   * Mark today's devotional completed and recalculate streak.
   */
  async markCompleted(date = null) {
    const response = await api.request('/api/motivations/complete', {
      method: 'POST',
      body: date ? { date } : {},
    });
    return response.data;
  }
}

export const motivationService = new MotivationService();

