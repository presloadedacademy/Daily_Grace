import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from '../context/NavigationContext.jsx';
import { userService } from '../services/userService.js';
import { api } from '../services/api.js';
import { Alert } from '../components/Alert.jsx';
import { LoadingSpinner } from '../components/LoadingSpinner.jsx';
import BottomNavigation from '../components/BottomNavigation.jsx';
import OtpVerificationModal from '../components/OtpVerificationModal.jsx';

export function ProfilePage() {
  const { user, login, logout, token } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailVerified, setEmailVerified] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const [nameError, setNameError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        const profile = await userService.getProfile();
        setName(profile.name || '');
        setEmail(profile.email || '');
        setEmailVerified(Boolean(profile.email_verified || profile.is_verified));
      } catch (err) {
        setFeedback({
          type: 'error',
          message: err.message || 'Could not load your profile details.',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setFeedback(null);
    setNameError('');

    if (!name.trim()) {
      setNameError('Name cannot be empty.');
      return;
    }

    if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters long.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await userService.updateProfile({ name: name.trim() });
      setName(updated.name);
      if (user && token) {
        login(token, { ...user, name: updated.name });
      }
      setFeedback({
        type: 'success',
        message: 'Your profile has been updated successfully.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update name. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyEmail = () => {
    if (!email) return;
    setFeedback(null);
    setIsSendingVerification(false);
    setShowOtpModal(true);
  };

  const handleOtpSuccess = (updatedUser) => {
    setShowOtpModal(false);
    setEmailVerified(true);
    if (user && token) {
      login(token, {
        ...user,
        email_verified: true,
        is_verified: true,
        ...updatedUser,
      });
    }
    setFeedback({
      type: 'success',
      message: 'Your email address has been verified successfully! Welcome to Daily Grace.',
    });
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
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

  const initial = name ? name.trim().charAt(0).toUpperCase() : 'U';

  return (
    <div className="mobile-app-shell">
      <div className="mobile-app-container">

        {/* 1. PROFILE TOP HEADER */}
        <header className="profile-mobile-header">
          <div>
            <span className="profile-header-tag">ACCOUNT & JOURNEY</span>
            <h1 className="profile-header-title">Your Profile</h1>
          </div>
        </header>

        {isLoading ? (
          <div className="today-mobile-loading">
            <LoadingSpinner text="Loading your profile..." />
          </div>
        ) : (
          <main className="profile-mobile-content">

            {/* 2. AVATAR & USER SUMMARY CARD */}
            <section className="profile-avatar-card">
              <div className="profile-avatar-circle">
                <span className="profile-avatar-letter">{initial}</span>
                <span className="profile-avatar-dove" aria-hidden="true">🕊</span>
              </div>
              <h2 className="profile-user-name">{name || 'Child of God'}</h2>
              {emailVerified ? (
                <span className="profile-verified-pill">Verified Member ✓</span>
              ) : (
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#975A16',
                    backgroundColor: '#FEFCBF',
                    padding: '0.3rem 0.8rem',
                    borderRadius: 'var(--radius-full)',
                    letterSpacing: '0.03em',
                  }}
                >
                  Unverified Account
                </span>
              )}
            </section>

            {/* Feedback Alert */}
            {feedback && <Alert type={feedback.type} message={feedback.message} />}

            {/* Optional Email Verification Card if not yet verified */}
            {!emailVerified && (
              <section
                style={{
                  backgroundColor: '#FFFAF0',
                  border: '1px solid #FEEBC8',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>✉️</span>
                  <div>
                    <strong style={{ color: '#7B341E', fontSize: '0.92rem', display: 'block' }}>
                      Your email is not verified yet.
                    </strong>
                    <span style={{ color: '#9C4221', fontSize: '0.82rem' }}>
                      Verify your address to secure your devotional journey.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleVerifyEmail}
                  disabled={isSendingVerification}
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: '#DD6B20',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.5rem 1rem',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: isSendingVerification ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(221, 107, 32, 0.2)',
                  }}
                >
                  {isSendingVerification ? 'Sending Code...' : 'Verify Email'}
                </button>
              </section>
            )}

            {/* 3. EDIT PROFILE DETAILS CARD */}
            <section className="profile-form-card" style={{ marginBottom: '1.25rem' }}>
              <h3 className="profile-card-section-title">Personal Details</h3>

              <form onSubmit={handleSave} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="profile-name">
                    Full Name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    className={`form-input ${nameError ? 'has-error' : ''}`}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (nameError) setNameError('');
                      if (feedback) setFeedback(null);
                    }}
                    placeholder="Enter your name"
                    autoComplete="name"
                    required
                  />
                  {nameError && <p className="form-error">{nameError}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="profile-email">
                    <span>Email Address</span>
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    value={email}
                    disabled
                    className="form-input profile-email-disabled"
                  />
                  <span className="form-helper">
                    {emailVerified
                      ? 'Email address is verified and locked to your account.'
                      : 'Email address registered to your account.'}
                  </span>
                </div>

                <button
                  type="submit"
                  className="profile-save-btn"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </form>
            </section>

            {/* 4. SPIRITUAL PROMISE CARD */}
            <section className="profile-spiritual-card" style={{ marginBottom: '1.25rem' }}>
              <div className="spiritual-card-icon">✦</div>
              <p className="spiritual-card-quote">
                "The Lord bless you and keep you; the Lord make his face shine upon you and be gracious to you."
              </p>
              <cite className="spiritual-card-ref">— Numbers 6:24-25</cite>
            </section>

            {/* 5. SESSION & ACCOUNT MANAGEMENT */}
            <section className="profile-form-card">
              <h3 className="profile-card-section-title">Session & Account</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <button
                  type="button"
                  id="profile-signout-btn"
                  className="settings-signout-btn"
                  onClick={handleSignOut}
                  style={{ width: '100%' }}
                >
                  <span className="signout-icon">🚪</span>
                  <span>Sign Out</span>
                </button>

                <div style={{ paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '0.65rem' }}>
                    Permanently delete your account and all associated devotional history.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    style={{
                      background: 'none',
                      border: '1px solid #E53E3E',
                      color: '#E53E3E',
                      padding: '0.6rem 1.2rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </section>

          </main>
        )}

        {/* DELETE ACCOUNT CONFIRMATION MODAL */}
        {showDeleteModal && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
            <div className="modal-content" style={{ borderRadius: 'var(--radius-lg)' }}>
              <h3
                id="delete-modal-title"
                style={{
                  fontSize: '1.3rem',
                  color: '#C53030',
                  marginBottom: '0.75rem',
                  fontFamily: 'var(--font-serif)',
                }}
              >
                Delete your account?
              </h3>

              <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--color-text-muted)', marginBottom: '1.75rem' }}>
                This action is permanent and cannot be undone. All your Daily Grace reading history, daily devotional assignments, and profile settings will be permanently erased.
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
                  onClick={handleDeleteAccount}
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

        {/* OTP VERIFICATION MODAL */}
        <OtpVerificationModal
          isOpen={showOtpModal}
          email={email}
          onClose={() => setShowOtpModal(false)}
          onSuccess={handleOtpSuccess}
        />

        {/* 6. BOTTOM NAVIGATION */}
        <BottomNavigation activeTab="profile" />

      </div>
    </div>
  );
}

export default ProfilePage;
