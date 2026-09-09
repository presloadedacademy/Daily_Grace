import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from '../../context/NavigationContext.jsx';
import { userService } from '../../services/userService.js';
import AdminNav from '../../components/AdminNav.jsx';
import BottomNavigation from '../../components/BottomNavigation.jsx';
import { LoadingSpinner } from '../../components/LoadingSpinner.jsx';

export default function AdminSettingsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    setErrorMessage(null);
    setDeleting(true);
    try {
      await userService.deleteAccount();
      logout();
      navigate('/login');
    } catch (err) {
      setShowDeleteModal(false);
      setErrorMessage(err.data?.message || err.message || 'Failed to delete administrator account.');
    } finally {
      setDeleting(false);
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
                  05:00 AM (Daily)
                </span>
              </div>
            </section>

            {/* 4. PLATFORM CORE CONFIGURATION */}
            <section className="profile-form-card" style={{ marginBottom: '1.25rem' }}>
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

            {/* 5. SESSION & ACCOUNT MANAGEMENT */}
            <section className="profile-form-card">
              <h3 className="profile-card-section-title">Administrator Session</h3>
              <p className="settings-action-desc" style={{ marginBottom: '1rem' }}>
                Sign out of the administrator control panel.
              </p>

              <button
                type="button"
                id="admin-settings-signout-btn"
                className="settings-signout-btn"
                onClick={handleSignOut}
                style={{ width: '100%' }}
              >
                <span className="signout-icon">🚪</span>
                <span>Sign Out of Admin Console</span>
              </button>

              <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
                <h4 style={{ fontSize: '0.92rem', color: '#C53030', margin: '0 0 0.35rem 0', fontWeight: 700 }}>
                  Danger Zone
                </h4>
                <p className="settings-action-desc" style={{ marginBottom: '0.85rem' }}>
                  Permanently delete this administrator account. (Requires at least one other active administrator).
                </p>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  style={{
                    background: 'none',
                    border: '1px solid #E53E3E',
                    color: '#E53E3E',
                    padding: '0.6rem 1.25rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Delete Administrator Account
                </button>
              </div>
            </section>

          </main>
        )}

        {/* DELETE ACCOUNT CONFIRMATION MODAL */}
        {showDeleteModal && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="admin-settings-delete-modal-title">
            <div className="modal-content" style={{ borderRadius: 'var(--radius-lg)' }}>
              <h3
                id="admin-settings-delete-modal-title"
                style={{
                  fontSize: '1.3rem',
                  color: '#C53030',
                  marginBottom: '0.75rem',
                  fontFamily: 'var(--font-serif)',
                }}
              >
                Delete Administrator Account?
              </h3>

              <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--color-text-muted)', marginBottom: '1.75rem' }}>
                This will permanently delete this administrator profile. This action cannot be performed if you are the sole remaining system administrator.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
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
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    backgroundColor: '#C53030',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    cursor: deleting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete Account'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. BOTTOM NAVIGATION */}
        <BottomNavigation />

      </div>
    </div>
  );
}
