import React, { useState } from 'react';
import { Card } from '../components/Card.jsx';
import { Input } from '../components/Input.jsx';
import { Button } from '../components/Button.jsx';
import { Alert } from '../components/Alert.jsx';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export function LoginPage({ onNavigate }) {
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showResend, setShowResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState(null);
  const [userNotFound, setUserNotFound] = useState(false);

  const validateForm = () => {
    const errs = {};
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    }
    if (!formData.password) {
      errs.password = 'Password is required';
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
    if (serverError || userNotFound) {
      setServerError('');
      setUserNotFound(false);
      setShowResend(false);
      setResendStatus(null);
    }
  };

  const handleResend = async () => {
    if (!formData.email.trim()) return;
    setIsResending(true);
    setResendStatus(null);

    try {
      const res = await api.resendVerification(formData.email.trim());
      setResendStatus({
        type: 'success',
        message: res.message || 'A new verification link has been sent to your email address.',
      });
    } catch (err) {
      setResendStatus({
        type: 'error',
        message: err.message || 'Failed to resend verification email. Please try again.',
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setUserNotFound(false);
    setShowResend(false);
    setResendStatus(null);

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await api.login({
        email: formData.email,
        password: formData.password,
      });

      login(response.token, response.user);
      onNavigate('/home');
    } catch (err) {
      if (err.code === 'USER_NOT_FOUND') {
        setUserNotFound(true);
      } else if (err.code === 'INVALID_PASSWORD') {
        setServerError('Incorrect password. Please check your password and try again.');
      } else {
        const isUnverified =
          err.code === 'ACCOUNT_NOT_VERIFIED' ||
          (err.message && err.message.toLowerCase().includes('confirm your email')) ||
          (err.message && err.message.toLowerCase().includes('verify your email'));

        if (isUnverified) {
          setServerError('Please confirm your email address before logging in.');
          setShowResend(true);
        } else {
          setServerError(err.message || 'Invalid email or password.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="page-wrapper">
      <Card style={{ maxWidth: '440px' }}>
        <div className="text-center" style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '0.35rem' }}>Welcome Back</h2>
          <p className="tagline" style={{ fontSize: '1rem' }}>
            Enter your quiet place with God
          </p>
        </div>

        {serverError && <Alert type="error" message={serverError} />}

        {userNotFound && (
          <div
            style={{
              backgroundColor: '#FFF5F5',
              border: '1px solid #FEB2B2',
              borderRadius: 'var(--radius-md)',
              padding: '0.9rem 1.1rem',
              marginBottom: '1.25rem',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              color: '#9B2C2C',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🔍</span>
              <div>
                <strong>No account found with this email.</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                  Please check the spelling or{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('/register')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary)',
                      fontWeight: 700,
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '0.85rem',
                    }}
                  >
                    create an account
                  </button>{' '}
                  to get started.
                </p>
              </div>
            </div>
          </div>
        )}

        {showResend && (
          <div style={{ marginBottom: '1.25rem', padding: '1rem', backgroundColor: 'var(--surface-alt)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            {resendStatus ? (
              <Alert type={resendStatus.type} message={resendStatus.message} />
            ) : (
              <div>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: '0 0 0.75rem 0' }}>
                  Didn't receive your confirmation link or did it expire?
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResend}
                  isLoading={isResending}
                  style={{ fontSize: '0.88rem', padding: '0.5rem 1rem' }}
                >
                  Resend Verification Email
                </Button>
              </div>
            )}
          </div>
        )}


        <form onSubmit={handleSubmit} noValidate>
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
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            required
            autoComplete="current-password"
          />

          <Button
            type="submit"
            variant="primary"
            isFullWidth
            isLoading={isLoading}
            style={{ marginTop: '0.75rem', padding: '0.9rem 1.5rem' }}
          >
            Log In
          </Button>
        </form>

        <div className="text-center" style={{ marginTop: '1.75rem' }}>
          <p className="text-muted text-sm">
            Don't have an account yet?{' '}
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
              onClick={() => onNavigate('/register')}
            >
              Register
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
}

export default LoginPage;
