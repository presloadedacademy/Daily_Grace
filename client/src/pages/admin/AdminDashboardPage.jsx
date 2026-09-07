import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from '../../context/NavigationContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminService } from '../../services/adminService.js';
import AdminNav from '../../components/AdminNav.jsx';
import BottomNavigation from '../../components/BottomNavigation.jsx';
import { LoadingSpinner } from '../../components/LoadingSpinner.jsx';

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return 'Today';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Delete modal state
  const [deletingItem, setDeletingItem] = useState(null);
  const [deleteModalError, setDeleteModalError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getDashboard();
      setDashboardData(data);
    } catch (err) {
      setError(err.data?.message || err.message || 'Failed to load administrative dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleToggleStatus = async (item) => {
    const newStatus = item.status === 'published' ? 'draft' : 'published';
    try {
      setActionSuccess(null);
      await adminService.updateMotivationStatus(item.id, newStatus);
      setActionSuccess(`"${item.title}" is now ${newStatus}.`);
      fetchDashboard();
    } catch (err) {
      setError(err.data?.message || err.message || 'Failed to update motivation status.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      setIsDeleting(true);
      setDeleteModalError(null);
      await adminService.deleteMotivation(deletingItem.id);
      setDeletingItem(null);
      setActionSuccess('Motivation deleted successfully.');
      fetchDashboard();
    } catch (err) {
      setDeleteModalError(err.data?.message || err.message || 'Failed to delete motivation.');
    } finally {
      setIsDeleting(false);
    }
  };

  const stats = dashboardData?.stats;
  const todaysMotivation = dashboardData?.todaysMotivation;
  const recentMotivations = dashboardData?.recentMotivations || [];

  return (
    <div className="mobile-app-shell">
      <div className="mobile-app-container">

        {/* 1. ADMIN HEADER */}
        <header className="profile-mobile-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <span className="profile-header-tag">ADMIN CONSOLE</span>
              <h1 className="profile-header-title">Admin Dashboard</h1>
              <p className="home-dashboard-sub" style={{ marginTop: '0.25rem' }}>
                Welcome, {user?.name || 'Daily Grace Administrator'}
              </p>
            </div>
            <Link
              to="/admin/motivations/new"
              className="primary-gold-cta"
              style={{ width: 'auto', padding: '0.7rem 1.25rem', fontSize: '0.88rem', textDecoration: 'none', boxShadow: 'var(--shadow-sm)' }}
            >
              + Add Motivation
            </Link>
          </div>
        </header>

        {/* 2. ADMIN NAVIGATION TABS */}
        <AdminNav />

        {actionSuccess && (
          <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
            {actionSuccess}
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="today-mobile-loading">
            <LoadingSpinner text="Loading dashboard metrics..." />
          </div>
        ) : (
          <main className="profile-mobile-content">

            {/* 3. STATS SUMMARY GRID */}
            <div className="admin-stats-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="admin-stat-card">
                <span className="admin-stat-label">Total Motivations</span>
                <div className="admin-stat-number">{stats?.totalMotivations ?? 0}</div>
              </div>

              <div className="admin-stat-card">
                <span className="admin-stat-label">Published</span>
                <div className="admin-stat-number" style={{ color: 'var(--color-forest)' }}>
                  {stats?.publishedMotivations ?? 0}
                </div>
              </div>

              <div className="admin-stat-card">
                <span className="admin-stat-label">Drafts</span>
                <div className="admin-stat-number" style={{ color: 'var(--color-text-muted)' }}>
                  {stats?.draftMotivations ?? 0}
                </div>
              </div>

              <div className="admin-stat-card">
                <span className="admin-stat-label">Registered Users</span>
                <div className="admin-stat-number" style={{ color: 'var(--color-gold)' }}>
                  {stats?.totalUsers ?? 0}
                </div>
              </div>

              <div className="admin-stat-card">
                <span className="admin-stat-label">Total Admins</span>
                <div className="admin-stat-number" style={{ color: 'var(--color-primary)' }}>
                  {stats?.totalAdmins ?? 1}
                </div>
              </div>
            </div>

            {/* 4. TODAY'S MOTIVATION OVERVIEW CARD */}
            {todaysMotivation ? (
              <section className="admin-featured-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span className="admin-featured-tag">★ Featured Daily Content</span>
                  <span className={`admin-badge badge-${todaysMotivation.status}`}>
                    {todaysMotivation.status}
                  </span>
                </div>
                <h3 className="admin-featured-title">{todaysMotivation.title}</h3>
                <p className="admin-featured-verse">"{todaysMotivation.verse}"</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span className="admin-featured-ref">— {todaysMotivation.reference}</span>
                  <Link
                    to={`/admin/motivations/${todaysMotivation.id}/edit`}
                    className="admin-action-btn"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  >
                    ✏️ Edit Featured Content
                  </Link>
                </div>
              </section>
            ) : (
              <section className="admin-featured-card" style={{ borderLeftColor: 'var(--color-text-muted)' }}>
                <span className="admin-featured-tag">Today's Motivation</span>
                <h3 className="admin-featured-title" style={{ color: 'var(--color-text-muted)' }}>No Published Motivation Found</h3>
                <p className="admin-featured-verse">Add and publish motivations to deliver scripture to users.</p>
                <Link to="/admin/motivations/new" className="primary-gold-cta" style={{ display: 'inline-block', width: 'auto', marginTop: '0.5rem', textDecoration: 'none', padding: '0.6rem 1rem', fontSize: '0.85rem' }}>
                  + Create First Motivation
                </Link>
              </section>
            )}

            {/* 5. RECENT MOTIVATIONS TABLE SECTION */}
            <section className="profile-form-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 className="profile-card-section-title" style={{ margin: 0 }}>Recent Motivations</h3>
                  <p className="settings-action-desc" style={{ marginTop: '0.2rem', marginBottom: 0 }}>
                    Latest scriptures created or updated in the catalog.
                  </p>
                </div>
                <Link to="/admin/motivations" className="admin-action-btn" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                  View All ({stats?.totalMotivations ?? 0}) →
                </Link>
              </div>

              {recentMotivations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)' }}>
                  <p>No motivations created yet.</p>
                  <Link to="/admin/motivations/new" className="primary-gold-cta" style={{ width: 'auto', display: 'inline-block', textDecoration: 'none', marginTop: '0.5rem' }}>
                    + Add New Motivation
                  </Link>
                </div>
              ) : (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Title & Scripture</th>
                        <th>Status</th>
                        <th>Last Updated</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentMotivations.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong style={{ color: 'var(--color-primary)', display: 'block', fontSize: '0.92rem' }}>
                              {item.title}
                            </strong>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                              {item.reference}
                            </span>
                          </td>
                          <td>
                            <span className={`admin-badge badge-${item.status}`}>
                              {item.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                            {formatDate(item.updated_at || item.created_at)}
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleToggleStatus(item)}
                                className="admin-action-btn toggle"
                                title={item.status === 'published' ? 'Unpublish to Draft' : 'Publish to Live'}
                              >
                                {item.status === 'published' ? 'Unpublish' : 'Publish'}
                              </button>
                              <Link
                                to={`/admin/motivations/${item.id}/edit`}
                                className="admin-action-btn"
                                title="Edit Motivation"
                              >
                                Edit
                              </Link>
                              <button
                                onClick={() => {
                                  setDeletingItem(item);
                                  setDeleteModalError(null);
                                }}
                                className="admin-action-btn delete"
                                title="Delete Motivation"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

          </main>
        )}

        {/* 6. DELETE CONFIRMATION MODAL */}
        {deletingItem && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div className="auth-card" style={{ maxWidth: '440px', width: '100%', padding: '1.5rem', margin: 0 }}>
              <h3 style={{ color: 'var(--color-error)', margin: '0 0 0.5rem 0', fontFamily: 'var(--font-serif)', fontSize: '1.25rem' }}>
                Confirm Deletion
              </h3>
              <p style={{ color: 'var(--color-text)', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 1rem 0' }}>
                Are you sure you want to delete <strong>"{deletingItem.title}"</strong>?
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', margin: '0 0 1.25rem 0' }}>
                Note: Motivations that have already been assigned to users in their daily journey cannot be deleted to preserve history. You can unpublish them instead.
              </p>

              {deleteModalError && (
                <div className="alert alert-error" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {deleteModalError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setDeletingItem(null)}
                  disabled={isDeleting}
                  className="settings-reset-btn"
                  style={{ width: 'auto', padding: '0.6rem 1rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="primary-gold-cta"
                  style={{ width: 'auto', padding: '0.6rem 1.2rem', backgroundColor: 'var(--color-error)' }}
                >
                  {isDeleting ? 'Deleting…' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 7. BOTTOM NAVIGATION */}
        <BottomNavigation />

      </div>
    </div>
  );
}
