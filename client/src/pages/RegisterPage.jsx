import React, { useState } from 'react';
import { Card } from '../components/Card.jsx';
import { Input } from '../components/Input.jsx';
import { Button } from '../components/Button.jsx';
import { Alert } from '../components/Alert.jsx';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export function RegisterPage({ onNavigate }) {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errs.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await api.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      // Auto-login immediately into the app with JWT token
      if (response.token) {
        const userData = response.user || {
          id: response.id,
          name: response.name || formData.name.trim(),
          email: response.email || formData.email.trim().toLowerCase(),
          role: 'user',
          email_verified: false,
          notification_enabled: true,
          onboarding_completed: false,
        };
        login(response.token, userData);
        onNavigate('/home');
      } else {
        onNavigate('/login');
      }
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please check your information and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <Card style={{ maxWidth: '460px' }}>
        <div className="text-center" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '0.35rem' }}>Create Your Account</h2>
          <p className="tagline" style={{ fontSize: '1rem' }}>
            Begin your daily journey in scripture
          </p>
        </div>

        {serverError && <Alert type="error" message={serverError} />}

        <form onSubmit={handleSubmit} noValidate>
          <Input
            id="name"
            label="Full Name"
            placeholder="e.g. John Bunyan"
            value={formData.name}
            onChange={handleChange}
            error={errors.name}
            required
            autoComplete="name"
          />

          <Input
            id="email"
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            required
            autoComplete="email"
          />

          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="At least 8 characters"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            required
            autoComplete="new-password"
          />

          <Input
            id="confirmPassword"
            type="password"
            label="Confirm Password"
            placeholder="Repeat your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            required
            autoComplete="new-password"
          />

          <Button
            type="submit"
            variant="primary"
            isFullWidth
            isLoading={isLoading}
            style={{ marginTop: '0.75rem', padding: '0.9rem 1.5rem' }}
          >
            Create Account
          </Button>
        </form>

        <div className="text-center" style={{ marginTop: '1.75rem' }}>
          <p className="text-muted text-sm">
            Already have an account?{' '}
            <button
              className="btn-ghost"
              style={{
                border: 'none',
                background: 'none',
                color: 'var(--color-primary)',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '0 0.25rem',
                textDecoration: 'underline',
              }}
              onClick={() => onNavigate('/login')}
            >
              Log In
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
}


export default RegisterPage;
