import React, { useEffect, useState, useRef } from 'react';
import { Card } from '../components/Card.jsx';
import { Button } from '../components/Button.jsx';
import { Input } from '../components/Input.jsx';
import { Alert } from '../components/Alert.jsx';
import { LoadingSpinner } from '../components/LoadingSpinner.jsx';
import { api } from '../services/api.js';

export function VerifyEmailPage({ token: propToken, onNavigate }) {
  const [token, setToken] = useState(propToken || '');
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  // Resend flow on failure
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendResult, setResendResult] = useState(null);

  const verificationAttemptedRef = useRef(false);

  useEffect(() => {
    // Extract token from URL if not provided via props
    let rawToken = propToken;
    if (!rawToken) {
      const searchParams = new URLSearchParams(window.location.search);
      rawToken = searchParams.get('token');
    }

    setToken(rawToken || '');

    if (!rawToken) {
      setStatus('error');
      setErrorMessage('No verification token was provided in the link.');
      return;
    }

    if (verificationAttemptedRef.current) return;
    verificationAttemptedRef.current = true;

    async function executeVerification() {
      try {
        await api.verifyEmail(rawToken);
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setErrorMessage(
          err.message || 'This verification link may have expired or already been used.'
        );
      }
    }

    executeVerification();
  }, [propToken]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setIsResending(true);
    setResendResult(null);
    try {
      const res = await api.resendVerification(resendEmail);
      setResendResult({
        type: 'success',
        message: res.message || 'A new verification link has been sent to your email address.',
      });
    } catch (err) {
      setResendResult({
        type: 'error',
        message: err.message || 'Failed to request a new verification link. Please check your email.',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="page-wrapper">
      <Card className="text-center" style={{ maxWidth: '520px' }}>
        {status === 'loading' && (
          <div style={{ padding: '2rem 1rem' }}>
            <LoadingSpinner text="Verifying your email address..." />
          </div>
        )}

        {status === 'success' && (
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.85rem', letterSpacing: '2px', color: 'var(--color-accent)', fontWeight: 600, textTransform: 'uppercase' }}>
                DAILY GRACE
              </span>
            </div>

            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'rgba(53, 79, 66, 0.1)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto',
                fontSize: '1.75rem',
                fontWeight: 'bold',
              }}
            >
              ✓
            </div>

            <h2 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Email Confirmed ✓</h2>
            <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '0.5rem' }}>
              Your email has been successfully confirmed.
            </p>
            <p style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '2rem' }}>
              Your account is now ready.
            </p>

            <Button
              variant="primary"
              isFullWidth
              onClick={() => onNavigate('/login')}
              style={{ padding: '0.9rem 1.5rem' }}
            >
              Continue to Login
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: 'rgba(180, 40, 40, 0.1)',
                color: 'var(--color-error)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto',
                fontSize: '1.75rem',
              }}
            >
              ✕
            </div>

            <h2 style={{ marginBottom: '0.5rem', color: 'var(--color-error)' }}>Verification Link Invalid</h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              This verification link is invalid or has expired.
            </p>

            {resendResult && (
              <div style={{ marginBottom: '1.25rem' }}>
                <Alert type={resendResult.type} message={resendResult.message} />
              </div>
            )}

            <div
              style={{
                backgroundColor: 'var(--surface-alt)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1.5rem',
                textAlign: 'left',
              }}
            >
              <h3 style={{ fontSize: '1rem', marginBottom: '0.4rem', color: 'var(--color-primary)' }}>
                Request a new verification email
              </h3>
              <p className="text-muted text-sm" style={{ marginBottom: '0.9rem' }}>
                Enter your email address to receive a fresh verification link.
              </p>

              <form onSubmit={handleResend}>
                <Input
                  id="resend-email"
                  type="email"
                  placeholder="you@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  required
                />
                <Button
                  type="submit"
                  variant="outline"
                  isFullWidth
                  isLoading={isResending}
                  style={{ marginTop: '0.5rem' }}
                >
                  Resend Verification Email
                </Button>
              </form>
            </div>

            <Button
              variant="ghost"
              isFullWidth
              onClick={() => onNavigate('/login')}
            >
              Back to Login
            </Button>
          </div>
        )}

      </Card>
    </div>
  );
}

export default VerifyEmailPage;
