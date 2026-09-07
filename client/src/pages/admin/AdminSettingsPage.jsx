import React, { useState, useEffect } from 'react';
import { userService } from '../../services/userService.js';
import AdminNav from '../../components/AdminNav.jsx';
import BottomNavigation from '../../components/BottomNavigation.jsx';
import { LoadingSpinner } from '../../components/LoadingSpinner.jsx';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    async function loadPreferences() {
      try {
        setLoading(true);
        const profile = await userService.getProfile();
        if (profile) {
          setNotificationEnabled(Boolean(profile.notification_enabled));
        }
      } catch (err) {
        console.warn('Could not load preferences:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadPreferences();
  }, []);

  const handleToggleNotifications = async () => {
    const nextState = !notificationEnabled;
    try {
      setSaving(true);
      setFeedbackMessage(null);
      setErrorMessage(null);
      await userService.updatePreferences({ notificationEnabled: nextState });
      setNotificationEnabled(nextState);
      setFeedbackMessage(
        nextState
          ? 'Daily email reminders enabled successfully.'
          : 'Daily email reminders paused.'
      );
    } catch (err) {
      setErrorMessage(err.data?.message || err.message || 'Failed to update reminder settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mobile-app-shell">
      <div className="mobile-app-container">

        {/* 1. HEADER */}
        <header className="profile-mobile-header">
          <div>
            <span className="profile-header-tag">ADMINISTRATION</span>
            <h1 className="profile-header-title">System Settings</h1>
            <p className="home-dashboard-sub" style={{ marginTop: '0.2rem' }}>
              Configure Daily Grace platform preferences and automation parameters.
            </p>
          </div>
        </header>

        {/* 2. ADMIN NAV TABS */}
        <AdminNav />

        {feedbackMessage && (
          <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
            {feedbackMessage}
          </div>
        )}

        {errorMessage && (
          <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="today-mobile-loading">
            <LoadingSpinner text="Loading system settings..." />
          </div>
        ) : (
          <main className="profile-mobile-content">

            {/* 3. NOTIFICATION & DISPATCH SETTINGS */}
            <section className="profile-form-card" style={{ marginBottom: '1.25rem' }}>
              <h3 className="profile-card-section-title">Daily Email Reminders</h3>
              <p className="settings-action-desc" style={{ marginBottom: '1rem' }}>
                Automated daily devotionals are dispatched every morning to verified readers.
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem', marginBottom: '0.85rem' }}>
                <div>
                  <strong style={{ color: 'var(--color-primary)', display: 'block', fontSize: '0.92rem' }}>
                    Admin Notification Status
                  </strong>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                    Receive daily email devotionals at scheduled time
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleNotifications}
                  disabled={saving}
                  className="settings-reset-btn"
                  style={{
                    padding: '0.45rem 1rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    borderColor: notificationEnabled ? 'var(--color-forest)' : 'var(--border-medium)',
                    color: notificationEnabled ? 'var(--color-forest)' : 'var(--color-text-muted)',
                    backgroundColor: notificationEnabled ? 'rgba(46, 90, 68, 0.08)' : 'transparent',
                  }}
                >
                  {notificationEnabled ? '● ON' : '○ OFF'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: 'var(--color-primary)', display: 'block', fontSize: '0.92rem' }}>
                    Scheduled Dispatch Time
                  </strong>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                    Configured in server environment
                  </span>
                </div>
                <span className="admin-badge badge-admin">
                  08:00 AM (Daily)
                </span>
              </div>
            </section>

            {/* 4. PLATFORM CORE CONFIGURATION */}
            <section className="profile-form-card">
              <h3 className="profile-card-section-title">Platform Information</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.65rem' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>Application Name</span>
                  <strong style={{ color: 'var(--color-primary)', fontSize: '0.92rem' }}>Daily Grace</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.65rem' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>Content Delivery Engine</span>
                  <span style={{ color: 'var(--color-forest)', fontSize: '0.85rem', fontWeight: 600 }}>
                    Automated Anti-Repetition Cycles
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.65rem' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>Daily Assignment Storage</span>
                  <span style={{ color: 'var(--color-gold)', fontSize: '0.85rem', fontWeight: 600 }}>
                    PostgreSQL <code style={{ fontSize: '0.8rem' }}>daily_motivations</code>
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>Security Protocol</span>
                  <span style={{ color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                    JWT + PostgreSQL UUID RBAC
                  </span>
                </div>
              </div>
            </section>

          </main>
        )}

        {/* 5. BOTTOM NAVIGATION */}
        <BottomNavigation />

      </div>
    </div>
  );
}
