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

    let body = options.body;
    if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
      body = JSON.stringify(body);
    }

    const config = {
      ...options,
      headers,
      body,
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

  sendVerificationOtp() {
    return this.request('/api/auth/send-verification-otp', {
      method: 'POST',
    });
  }

  verifyEmailOtp(code) {
    return this.request('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  getMe() {
    return this.request('/api/auth/me', {
      method: 'GET',
    });
  }

  post(endpoint, body, options = {}) {
    const formatted = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    return this.request(formatted, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  get(endpoint, options = {}) {
    const formatted = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    return this.request(formatted, {
      method: 'GET',
      ...options,
    });
  }
}

export const api = new ApiClient();
