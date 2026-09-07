import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminService } from '../../services/adminService.js';
import AdminNav from '../../components/AdminNav.jsx';
import BottomNavigation from '../../components/BottomNavigation.jsx';

export default function AdminProfilePage() {
  const { user } = useAuth();

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

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

        </main>

        {/* 5. BOTTOM NAVIGATION */}
        <BottomNavigation />

      </div>
    </div>
  );
}
