import React from 'react';
import { Button } from '../components/Button.jsx';
import { Card } from '../components/Card.jsx';

export function WelcomePage({ onNavigate }) {
  return (
    <div className="page-wrapper">
      <Card className="text-center" style={{ maxWidth: '580px', padding: '3.5rem 2.5rem' }}>
        {/* Subtle Spiritual Emblem */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'var(--surface-alt)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
            fontSize: '1.25rem',
          }}
          aria-hidden="true"
        >
          †
        </div>

        <h1 className="brand-title" style={{ marginBottom: '0.5rem' }}>
          DAILY GRACE
        </h1>

        <p className="tagline" style={{ marginBottom: '2rem' }}>
          One Scripture. One Reflection. One Day at a Time.
        </p>

        <div
          style={{
            width: '40px',
            height: '1px',
            backgroundColor: 'var(--color-accent)',
            margin: '0 auto 2.5rem auto',
            opacity: 0.7,
          }}
        />

        <p
          className="text-muted"
          style={{
            fontSize: '1.05rem',
            lineHeight: 1.7,
            marginBottom: '2.5rem',
            maxWidth: '440px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          A quiet space to nourish your soul every morning with God's word, heartfelt reflection, and prayer.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%', maxWidth: '320px', margin: '0 auto' }}>
          <Button
            variant="primary"
            isFullWidth
            onClick={() => onNavigate('/register')}
            style={{ fontSize: '1rem', padding: '0.95rem 1.5rem' }}
          >
            Begin Your Journey
          </Button>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            <Button
              variant="outline"
              isFullWidth
              onClick={() => onNavigate('/login')}
              style={{ fontSize: '0.9rem', padding: '0.75rem 1rem' }}
            >
              Sign In
            </Button>
            <Button
              variant="outline"
              isFullWidth
              onClick={() => onNavigate('/register')}
              style={{ fontSize: '0.9rem', padding: '0.75rem 1rem' }}
            >
              Register
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default WelcomePage;
