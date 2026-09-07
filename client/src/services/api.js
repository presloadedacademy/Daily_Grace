const API_BASE_URL = import.meta.env.VITE_API_URL || '';

class ApiClient {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('daily_grace_token');

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(data.message || 'Something went wrong. Please try again.');
        error.code = data.code;
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      if (err.status) {
        throw err;
      }
      const networkError = new Error('Unable to connect to Daily Grace server. Please check your network connection.');
      networkError.code = 'NETWORK_ERROR';
      throw networkError;
    }
  }

  // Authentication API calls
  register(userData) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  login(credentials) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  verifyEmail(token) {
    return this.request(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: 'GET',
    });
  }


  resendVerification(email) {
    return this.request('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  getMe() {
    return this.request('/api/auth/me', {
      method: 'GET',
    });
  }
}

export const api = new ApiClient();
