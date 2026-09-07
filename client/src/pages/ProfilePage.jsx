import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { userService } from '../services/userService.js';
import { Alert } from '../components/Alert.jsx';
import { LoadingSpinner } from '../components/LoadingSpinner.jsx';
import BottomNavigation from '../components/BottomNavigation.jsx';

export function ProfilePage() {
  const { user, login, token } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        const profile = await userService.getProfile();
        setName(profile.name || '');
        setEmail(profile.email || '');
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
              <span className="profile-verified-pill">Verified Account ✓</span>
            </section>

            {/* Feedback Alert */}
            {feedback && <Alert type={feedback.type} message={feedback.message} />}

            {/* 3. EDIT PROFILE DETAILS CARD */}
            <section className="profile-form-card">
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
                    Email address is verified and locked to your account.
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
            <section className="profile-spiritual-card">
              <div className="spiritual-card-icon">✦</div>
              <p className="spiritual-card-quote">
                "The Lord bless you and keep you; the Lord make his face shine upon you and be gracious to you."
              </p>
              <cite className="spiritual-card-ref">— Numbers 6:24-25</cite>
            </section>
          </main>
        )}

        {/* 5. BOTTOM NAVIGATION */}
        <BottomNavigation />

      </div>
    </div>
  );
}

export default ProfilePage;
