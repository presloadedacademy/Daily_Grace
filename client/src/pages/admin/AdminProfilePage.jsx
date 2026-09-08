import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from '../../context/NavigationContext.jsx';
import { adminService } from '../../services/adminService.js';
import { userService } from '../../services/userService.js';
import AdminNav from '../../components/AdminNav.jsx';
import BottomNavigation from '../../components/BottomNavigation.jsx';

export default function AdminProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    setError(null);
    setDeleting(true);
    try {
      await userService.deleteAccount();
      logout();
      navigate('/login');
    } catch (err) {
      setShowDeleteModal(false);
      setError(err.data?.message || err.message || 'Failed to delete administrator account.');
    } finally {
      setDeleting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!passwordForm.currentPassword) {
      setError('Please enter your current password.');
      return;
    }

    if (!passwordForm.newPassword) {
      setError('Please enter a new password.');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    try {
      setSaving(true);
      const res = await adminService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

      setSuccess(res.message || 'Administrator password changed successfully.');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setError(err.data?.message || err.message || 'Failed to update administrator password.');
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
            <h1 className="profile-header-title">Admin Profile</h1>
            <p className="home-dashboard-sub" style={{ marginTop: '0.2rem' }}>
              Manage your administrator credentials and account security.
            </p>
          </div>
        </header>

        {/* 2. ADMIN NAV TABS */}
        <AdminNav />

        {success && (
          <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
            {success}
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        <main className="profile-mobile-content">

          {/* 3. ADMIN DETAILS CARD */}
          <section className="profile-form-card" style={{ marginBottom: '1.5rem' }}>
            <h3 className="profile-card-section-title">Administrator Identity</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.65rem' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>Name</span>
                <strong style={{ color: 'var(--color-primary)', fontSize: '0.92rem' }}>{user?.name || 'Daily Grace Administrator'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.65rem' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>Email Address</span>
                <span style={{ color: 'var(--color-text)', fontSize: '0.9rem', fontWeight: 500 }}>{user?.email || 'admindailygrace@gmail.com'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.65rem' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>System Role</span>
                <span className="admin-badge badge-admin">★ Administrator</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>Account ID</span>
                <span style={{ color: 'var(--color-text-light)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                  {user?.id ? `${user.id.substring(0, 13)}…` : 'Verified UUID'}
                </span>
              </div>
            </div>
          </section>

          {/* 4. CHANGE PASSWORD CARD */}
          <section className="profile-form-card">
            <h3 className="profile-card-section-title">Change Administrator Password</h3>
            <p className="settings-action-desc" style={{ marginBottom: '1.25rem' }}>
              Update your account password. Password will be securely hashed with bcrypt.
            </p>

            <form onSubmit={handlePasswordSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="currentPassword">
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="newPassword">
                  New Password (Minimum 8 characters)
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="Enter new strong password"
                  value={passwordForm.newPassword}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirmPassword">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Re-type new password"
                  value={passwordForm.confirmPassword}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <button
                type="submit"
                className="primary-gold-cta"
                disabled={saving}
                style={{ marginTop: '0.5rem', width: '100%', padding: '0.9rem' }}
              >
                {saving ? 'Updating Password...' : 'Change Password'}
              </button>
            </form>
          </section>

          {/* 5. SESSION & ACCOUNT MANAGEMENT */}
          <section className="profile-form-card" style={{ marginTop: '1.5rem' }}>
            <h3 className="profile-card-section-title">Administrator Session</h3>
            <p className="settings-action-desc" style={{ marginBottom: '1rem' }}>
              Sign out of the administrator control panel.
            </p>

            <button
              type="button"
              id="admin-signout-btn"
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

        {/* DELETE ACCOUNT CONFIRMATION MODAL */}
        {showDeleteModal && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="admin-delete-modal-title">
            <div className="modal-content" style={{ borderRadius: 'var(--radius-lg)' }}>
              <h3
                id="admin-delete-modal-title"
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
