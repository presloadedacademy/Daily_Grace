import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from '../context/NavigationContext.jsx';
import { userService } from '../services/userService.js';
import { PushNotificationClient } from '../services/pushNotificationService.js';
import { Alert } from '../components/Alert.jsx';
import { LoadingSpinner } from '../components/LoadingSpinner.jsx';
import BottomNavigation from '../components/BottomNavigation.jsx';

function formatDisplayTime(timeStr) {
  if (!timeStr) return '05:00 AM';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayHour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [userProfile, setUserProfile] = useState(null);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('05:00');
  const [timezone, setTimezone] = useState('Africa/Lagos');
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingPreference, setIsUpdatingPreference] = useState(false);
  const [isSavingTime, setIsSavingTime] = useState(false);
  const [isEnablingDevice, setIsEnablingDevice] = useState(false);
  const [isTestingDevice, setIsTestingDevice] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      try {
        const [profile, devStatus] = await Promise.all([
          userService.getProfile(),
          PushNotificationClient.getDevicePushStatus(),
        ]);
        setUserProfile(profile);
        setNotificationEnabled(Boolean(profile.notification_enabled));
        setReminderTime(profile.reminder_time || '05:00');
        setTimezone(profile.timezone || 'Africa/Lagos');
        setDeviceStatus(devStatus);
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
        message: `Daily Grace notifications are now ${newValue ? 'active' : 'paused'}.`,
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

  const handleReminderTimeChange = async (e) => {
    const newTime = e.target.value;
    setReminderTime(newTime);
    setIsSavingTime(true);
    setFeedback(null);

    try {
      await userService.updatePreferences({ reminderTime: newTime, timezone });
      setFeedback({
        type: 'success',
        message: `Daily reminder time updated to ${formatDisplayTime(newTime)}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update reminder time.',
      });
    } finally {
      setIsSavingTime(false);
    }
  };

  const handleEnableDevice = async () => {
    setIsEnablingDevice(true);
    setFeedback(null);

    try {
      // Direct call on user click thread without preceding async delay
      await PushNotificationClient.enableDeviceNotifications();
      const updatedStatus = await PushNotificationClient.getDevicePushStatus();
      setDeviceStatus(updatedStatus);
      setFeedback({
        type: 'success',
        message: 'Notifications are now successfully enabled on this device!',
      });
    } catch (err) {
      const updatedStatus = await PushNotificationClient.getDevicePushStatus().catch(() => null);
      if (updatedStatus) setDeviceStatus(updatedStatus);

      setFeedback({
        type: 'error',
        message: err.message || 'Failed to enable notifications on this device.',
      });
    } finally {
      setIsEnablingDevice(false);
    }
  };

  const handleTestDevice = async () => {
    setIsTestingDevice(true);
    setFeedback(null);

    try {
      const res = await PushNotificationClient.testCurrentDevice(deviceStatus?.endpoint);
      setFeedback({
        type: 'success',
        message: res.message || 'Test notification was accepted by the browser push service. Please check your screen or notification tray.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to send test notification to this device.',
      });
    } finally {
      setIsTestingDevice(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setFeedback(null);
    try {
      await userService.deleteAccount();
      logout();
      navigate('/register');
    } catch (err) {
      setShowDeleteModal(false);
      setFeedback({
        type: 'error',
        message: err.data?.message || err.message || 'Failed to delete account. Please try again.',
      });
    } finally {
      setIsDeleting(false);
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
                <h3 className="profile-card-section-title" style={{ margin: 0 }}>Daily Grace Notifications</h3>
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

              {/* Account Notification Toggle */}
              <div className="settings-toggle-row">
                <div>
                  <span className="settings-toggle-label">Daily Grace Notifications</span>
                  <span className="settings-toggle-sub">
                    Receive your daily Scripture, reflection and prayer reminder.
                  </span>
                </div>

                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={notificationEnabled}
                    onChange={handleTogglePreference}
                    disabled={isUpdatingPreference}
                    aria-label="Toggle Daily Grace Notifications"
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              {/* Per-User Reminder Time Picker */}
              <div className="settings-time-row">
                <div>
                  <label htmlFor="daily-reminder-time" className="settings-toggle-label" style={{ display: 'block', cursor: 'pointer' }}>
                    Daily reminder time
                  </label>
                  <span className="settings-toggle-sub">
                    Select the time for your daily devotional notification ({timezone}).
                  </span>
                </div>

                <input
                  type="time"
                  id="daily-reminder-time"
                  className="settings-time-input"
                  value={reminderTime}
                  onChange={handleReminderTimeChange}
                  disabled={isSavingTime || !notificationEnabled}
                  aria-label="Daily reminder time"
                />
              </div>

              {/* Delivery Details */}
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border-light)', fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div>
                  <strong style={{ color: 'var(--color-text)' }}>Recipient: </strong>
                  <span>{recipientEmail}</span>
                </div>
                <div>
                  <strong style={{ color: 'var(--color-text)' }}>Schedule: </strong>
                  <span>Daily at {formatDisplayTime(reminderTime)} ({timezone})</span>
                </div>
                <div>
                  <strong style={{ color: 'var(--color-text)' }}>Content: </strong>
                  <span>Today's assigned Scripture, Reflection & Prayer</span>
                </div>
              </div>

              {/* 2B. THIS DEVICE NOTIFICATIONS CARD */}
              <div className="settings-device-card" id="settings-device-setup">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text)' }}>
                    This Device Setup
                  </span>

                  {deviceStatus?.status === 'subscribed' && (
                    <span className="settings-status-badge active">
                      ✓ Active on this device
                    </span>
                  )}
                  {deviceStatus?.status === 'prompt' && (
                    <span className="settings-status-badge pending">
                      ⚠️ Permission needed
                    </span>
                  )}
                  {deviceStatus?.status === 'denied' && (
                    <span className="settings-status-badge blocked">
                      🚫 Blocked in browser
                    </span>
                  )}
                  {deviceStatus?.status === 'ios_not_standalone' && (
                    <span className="settings-status-badge info">
                      📱 Install to Home Screen
                    </span>
                  )}
                  {deviceStatus?.status === 'unsupported' && (
                    <span className="settings-status-badge">
                      Unsupported
                    </span>
                  )}
                </div>

                <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                  {deviceStatus?.status === 'subscribed'
                    ? 'This phone/browser is registered to receive Web Push notifications.'
                    : deviceStatus?.status === 'denied'
                    ? 'Notifications are currently blocked by Chrome or your mobile browser settings.'
                    : deviceStatus?.status === 'ios_not_standalone'
                    ? 'iPhone requires adding Daily Grace to your Home Screen before notifications can be enabled.'
                    : 'To receive daily reminders on this phone or laptop, enable notifications for this device.'}
                </p>

                {/* Device Actions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {deviceStatus?.status === 'subscribed' ? (
                    <button
                      type="button"
                      id="settings-test-device-btn"
                      className="btn btn-outline"
                      onClick={handleTestDevice}
                      disabled={isTestingDevice}
                      style={{ padding: '0.55rem 1.1rem', fontSize: '0.84rem' }}
                    >
                      {isTestingDevice ? 'Sending test push…' : 'Send test notification to this device'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      id="settings-enable-device-btn"
                      className="btn btn-primary"
                      onClick={handleEnableDevice}
                      disabled={isEnablingDevice || deviceStatus?.status === 'unsupported'}
                      style={{ padding: '0.65rem 1.25rem', fontSize: '0.88rem', fontWeight: 600 }}
                    >
                      {isEnablingDevice ? 'Enabling notifications…' : 'Enable notifications on this device'}
                    </button>
                  )}
                </div>

                {/* Troubleshooting Instructions for Blocked Permissions */}
                {deviceStatus?.status === 'denied' && (
                  <div className="settings-instructions-box blocked">
                    <strong>How to unblock in Chrome on your phone:</strong>
                    <ol style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                      <li>Tap the <strong>tune icon (🎛️)</strong> or <strong>lock icon</strong> in the Chrome address bar at the top.</li>
                      <li>Tap <strong>Permissions</strong> → <strong>Notifications</strong>.</li>
                      <li>Switch the toggle from <strong>Block</strong> to <strong>Allow</strong>.</li>
                      <li>Return here and tap <strong>Enable notifications on this device</strong>.</li>
                    </ol>
                    <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.78rem' }}>
                      <em>Or open Chrome Settings → Site Settings → Notifications → tap Daily Grace → Allow.</em>
                    </p>
                  </div>
                )}

                {/* iOS Installation Instructions */}
                {deviceStatus?.status === 'ios_not_standalone' && (
                  <div className="settings-instructions-box info">
                    <strong>How to enable on iPhone / iPad (iOS 16.4+):</strong>
                    <ol style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
                      <li>In Safari, tap the <strong>Share</strong> button (the square with an arrow pointing up).</li>
                      <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                      <li>Open the Daily Grace icon from your Home Screen.</li>
                      <li>Go to Settings and tap <strong>Enable notifications on this device</strong>.</li>
                    </ol>
                  </div>
                )}
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

            {/* 4. ACCOUNT & SESSION (SIGN OUT & DELETE) */}
            <section className="settings-section-card">
              <h3 className="profile-card-section-title">Session & Account</h3>
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

              <div style={{ marginTop: '1.5rem', paddingTop: '125rem', borderTop: '1px solid var(--border-subtle)' }}>
                <h4 style={{ fontSize: '0.92rem', color: '#C53030', margin: '0 0 0.35rem 0', fontWeight: 700 }}>
                  Danger Zone
                </h4>
                <p className="settings-action-desc" style={{ marginBottom: '0.85rem' }}>
                  Permanently delete your account, saved preferences, and all reading progress.
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
                  Delete Account
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

        {/* 6. DELETE ACCOUNT CONFIRMATION MODAL */}
        {showDeleteModal && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-account-modal-title">
            <div className="modal-content" style={{ borderRadius: 'var(--radius-lg)' }}>
              <h3
                id="delete-account-modal-title"
                style={{
                  fontSize: '1.3rem',
                  color: '#C53030',
                  marginBottom: '0.75rem',
                  fontFamily: 'var(--font-serif)',
                }}
              >
                Permanently delete account?
              </h3>

              <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--color-text-muted)', marginBottom: '1.75rem' }}>
                All of your reading history, daily motivational assignments, and account settings will be erased permanently from Daily Grace. This action cannot be undone.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
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
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    backgroundColor: '#C53030',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete Account'}
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
