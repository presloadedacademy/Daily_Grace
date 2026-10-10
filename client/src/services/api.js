const resolveApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && !envUrl.includes('dailygrace.work.gd')) {
    return envUrl.replace(/\/+$/, '');
  }
  // Production fallback on non-localhost domains (e.g. Vercel)
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
    return 'https://daily-grace.onrender.com';
  }
  return '';
};

const API_BASE_URL = resolveApiBaseUrl();

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
      const fullUrl = `${API_BASE_URL}${endpoint}`;
      const response = await fetch(fullUrl, config);
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('text/html') && endpoint.startsWith('/api/')) {
        const error = new Error(`API endpoint ${endpoint} unexpectedly returned HTML instead of JSON. The backend service may be starting up or the route is misconfigured.`);
        error.code = 'UNEXPECTED_HTML_RESPONSE';
        error.status = response.status;
        throw error;
      }

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
      if (err.status || err.code === 'UNEXPECTED_HTML_RESPONSE') {
        throw err;
      }
      const networkError = new Error(`Unable to connect to Daily Grace server at ${API_BASE_URL || 'current host'}. Please check your network connection.`);
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
