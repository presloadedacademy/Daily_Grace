import { api } from './api.js';

export const adminService = {
  /**
   * Fetch full dashboard data (stats, today's motivation, recent motivations).
   */
  async getDashboard() {
    const response = await api.request('/api/admin/dashboard', { method: 'GET' });
    return response.data;
  },

  /**
   * Fetch overview statistics.
   */
  async getStats() {
    const response = await api.request('/api/admin/stats', { method: 'GET' });
    return response.stats;
  },

  /**
   * Fetch paginated list of motivations with search & status filters.
   */
  async listMotivations({ page = 1, limit = 20, q = '', status = 'all' } = {}) {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    if (q) params.append('q', q);
    if (status && status !== 'all') params.append('status', status);

    const response = await api.request(`/api/admin/motivations?${params.toString()}`, {
      method: 'GET',
    });
    return response;
  },

  /**
   * Fetch single motivation by ID.
   */
  async getMotivation(id) {
    const response = await api.request(`/api/admin/motivations/${id}`, { method: 'GET' });
    return response.data;
  },

  /**
   * Create a new motivation.
   */
  async createMotivation(data) {
    const response = await api.request('/api/admin/motivations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  /**
   * Update an existing motivation.
   */
  async updateMotivation(id, data) {
    const response = await api.request(`/api/admin/motivations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  /**
   * Fast toggle or update motivation status.
   */
  async updateMotivationStatus(id, status) {
    const response = await api.request(`/api/admin/motivations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return response.data;
  },

  /**
   * Delete a motivation.
   */
  async deleteMotivation(id) {
    const response = await api.request(`/api/admin/motivations/${id}`, {
      method: 'DELETE',
    });
    return response;
  },

  /**
   * Fetch registered users with pagination & search.
   */
  async listUsers({ page = 1, limit = 20, q = '', role = 'all' } = {}) {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    if (q) params.append('q', q);
    if (role && role !== 'all') params.append('role', role);

    const response = await api.request(`/api/admin/users?${params.toString()}`, {
      method: 'GET',
    });
    return response;
  },

  /**
   * Change admin password.
   */
  async changePassword({ currentPassword, newPassword, confirmPassword }) {
    const response = await api.request('/api/admin/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
    return response;
  },
};

