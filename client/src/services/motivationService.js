import { api } from './api.js';

class MotivationService {
  /**
   * Fetch today's assigned scripture, reflection, and prayer for the authenticated user.
   */
  async getTodaysMotivation() {
    const response = await api.request('/api/motivations/today', {
      method: 'GET',
    });
    return response.data;
  }
}

export const motivationService = new MotivationService();
