import { api } from './api.js';

class UserService {
  /**
   * Get user profile details.
   */
  async getProfile() {
    const response = await api.request('/api/users/profile', {
      method: 'GET',
    });
    return response.user;
  }

  /**
   * Update authenticated user's name.
   */
  async updateProfile({ name }) {
    const response = await api.request('/api/users/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
    return response.user;
  }

  /**
   * Update notification preferences (enabled, reminder time, timezone).
   */
  async updatePreferences({ notificationEnabled, reminderTime, timezone }) {
    const payload = {};
    if (notificationEnabled !== undefined) payload.notificationEnabled = notificationEnabled;
    if (reminderTime !== undefined) payload.reminderTime = reminderTime;
    if (timezone !== undefined) payload.timezone = timezone;

    const response = await api.request('/api/users/preferences', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.preferences;
  }

  /**
   * Reset daily motivation journey.
   */
  async resetJourney() {
    const response = await api.request('/api/users/reset-journey', {
      method: 'POST',
    });
    return response;
  }

  /**
   * Mark onboarding as completed for the authenticated user in PostgreSQL.
   */
  async completeOnboarding() {
    const response = await api.request('/api/users/complete-onboarding', {
      method: 'POST',
      body: JSON.stringify({ completed: true }),
    });
    return response.user || response;
  }

  /**
   * Send test daily reminder email to the authenticated user.
   */
  async sendTestReminder() {
    const response = await api.request('/api/reminders/send-test', {
      method: 'POST',
    });
    return response;
  }

  /**
   * Delete authenticated user's account and associated data permanently.
   */
  async deleteAccount() {
    const response = await api.request('/api/users/me', {
      method: 'DELETE',
    });
    return response;
  }
}

export const userService = new UserService();


