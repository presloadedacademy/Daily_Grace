import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from '../context/NavigationContext.jsx';
import { userService } from '../services/userService.js';
import { Alert } from '../components/Alert.jsx';
import { LoadingSpinner } from '../components/LoadingSpinner.jsx';
import BottomNavigation from '../components/BottomNavigation.jsx';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [userProfile, setUserProfile] = useState(null);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingPreference, setIsUpdatingPreference] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }


  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      try {
        const profile = await userService.getProfile();
        setUserProfile(profile);
        setNotificationEnabled(Boolean(profile.notification_enabled));
      } catch (err) {
        setFeedback({
          type: 'error',
          message: err.message || 'Could not load your preferences.',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleTogglePreference = async (e) => {
    const newValue = e.target.checked;
    setNotificationEnabled(newValue);
    setIsUpdatingPreference(true);
    setFeedback(null);

    try {
      await userService.updatePreferences({ notificationEnabled: newValue });
      setFeedback({
        type: 'success',
        message: `Daily reminder has been ${newValue ? 'enabled' : 'disabled'}.`,
      });
    } catch (err) {
      setNotificationEnabled(!newValue);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update notification preference.',
      });
    } finally {
      setIsUpdatingPreference(false);
    }
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    setFeedback(null);
    try {
      await userService.resetJourney();
      setShowConfirmModal(false);
      navigate('/home');
    } catch (err) {
      setShowConfirmModal(false);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to reset journey. Please try again.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const recipientEmail = userProfile?.email || user?.email || 'Your registered email';

  return (
    <div className="mobile-app-shell">
      <div className="mobile-app-container">

        {/* 1. SETTINGS TOP HEADER */}
        <header className="profile-mobile-header">
          <div>
            <span className="profile-header-tag">PREFERENCES & NOTIFICATIONS</span>
            <h1 className="profile-header-title">Settings</h1>
          </div>
        </header>

        {isLoading ? (
          <div className="today-mobile-loading">
            <LoadingSpinner text="Loading settings..." />
          </div>
        ) : (
          <main className="profile-mobile-content">

            {/* Feedback Alert */}
            {feedback && <Alert type={feedback.type} message={feedback.message} />}

            {/* 2. NOTIFICATIONS PREFERENCES CARD */}
            <section className="settings-section-card" id="settings-reminders-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="profile-card-section-title" style={{ margin: 0 }}>Daily Reminders</h3>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    backgroundColor: notificationEnabled ? 'rgba(53, 79, 66, 0.1)' : 'rgba(100, 100, 100, 0.1)',
                    color: notificationEnabled ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  }}
                >
                  {notificationEnabled ? 'Active' : 'Paused'}
                </span>
              </div>

              <div className="settings-toggle-row">
                <div>
                  <span className="settings-toggle-label">Morning Motivation Email</span>
                  <span className="settings-toggle-sub">
                    {notificationEnabled
                      ? 'Receive your daily Scripture & prayer every morning'
                      : 'Reminders are currently paused'}
                  </span>
                </div>

                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={notificationEnabled}
                    onChange={handleTogglePreference}
                    disabled={isUpdatingPreference}
                    aria-label="Toggle Daily Reminder"
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              {/* Delivery Details */}
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border-light)', fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div>
                  <strong style={{ color: 'var(--color-text)' }}>Recipient: </strong>
                  <span>{recipientEmail}</span>
                </div>
                <div>
                  <strong style={{ color: 'var(--color-text)' }}>Schedule: </strong>
                  <span>Every morning at 08:00 AM (Africa/Lagos)</span>
                </div>
                <div>
                  <strong style={{ color: 'var(--color-text)' }}>Content: </strong>
                  <span>Today's assigned Scripture, Reflection & Prayer</span>
                </div>
              </div>
            </section>


            {/* 3. JOURNEY MANAGEMENT CARD */}
            <section className="settings-section-card">
              <h3 className="profile-card-section-title">Devotional Journey</h3>
              <div className="settings-action-block">
                <h4 className="settings-action-title">Reset Journey</h4>
                <p className="settings-action-desc">
                  Start your Daily Grace journey fresh from the beginning. This restarts your motivation cycle from day one.
                </p>
                <button
                  type="button"
                  className="settings-reset-btn"
                  onClick={() => setShowConfirmModal(true)}
                >
                  Reset Devotional Journey
                </button>
              </div>
            </section>

            {/* 4. ACCOUNT & SESSION (SIGN OUT) */}
            <section className="settings-section-card">
              <h3 className="profile-card-section-title">Session</h3>
              <div className="settings-action-block">
                <p className="settings-action-desc" style={{ marginBottom: '1rem' }}>
                  Sign out of your account on this device.
                </p>
                <button
                  type="button"
                  id="settings-signout-btn"
                  className="settings-signout-btn"
                  onClick={handleSignOut}
                >
                  <span className="signout-icon">🚪</span>
                  <span>Sign Out</span>
                </button>
              </div>
            </section>

          </main>
        )}

        {/* 5. RESET CONFIRMATION MODAL */}
        {showConfirmModal && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-content" style={{ borderRadius: 'var(--radius-lg)' }}>
              <h3 id="modal-title" style={{ fontSize: '1.3rem', color: 'var(--color-text)', marginBottom: '0.75rem', fontFamily: 'var(--font-serif)' }}>
                Reset your journey?
              </h3>

              <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--color-text-muted)', marginBottom: '1.75rem' }}>
                This will clear your personal motivation history and start your journey fresh from Day 1. This action cannot be undone.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="settings-btn-cancel"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isResetting}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'transparent',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="settings-btn-confirm-danger"
                  onClick={handleConfirmReset}
                  disabled={isResetting}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    backgroundColor: '#C53030',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    cursor: isResetting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isResetting ? 'Resetting...' : 'Yes, Reset Journey'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Tab Navigation */}
        <BottomNavigation activeTab="settings" />

      </div>
    </div>
  );
}

export default SettingsPage;

