import React, { useState, useEffect } from 'react';
import { Link } from '../../context/NavigationContext.jsx';
import { adminService } from '../../services/adminService.js';
import AdminNav from '../../components/AdminNav.jsx';
import BottomNavigation from '../../components/BottomNavigation.jsx';
import { LoadingSpinner } from '../../components/LoadingSpinner.jsx';

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminMotivationsListPage() {
  const [motivations, setMotivations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Delete modal state
  const [deletingItem, setDeletingItem] = useState(null);
  const [deleteModalError, setDeleteModalError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMotivations = async (page = 1, query = searchQuery, status = statusFilter) => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.listMotivations({
        page,
        limit: 10,
        q: query,
        status,
      });
      setMotivations(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.data?.message || err.message || 'Failed to fetch motivations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMotivations(1, searchQuery, statusFilter);
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMotivations(1, searchQuery, statusFilter);
  };

  const handleToggleStatus = async (item) => {
    const newStatus = item.status === 'published' ? 'draft' : 'published';
    try {
      setActionSuccess(null);
      await adminService.updateMotivationStatus(item.id, newStatus);
      setActionSuccess(`"${item.title}" is now ${newStatus}.`);
      fetchMotivations(pagination.page, searchQuery, statusFilter);
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
      fetchMotivations(pagination.page, searchQuery, statusFilter);
    } catch (err) {
      setDeleteModalError(err.data?.message || err.message || 'Failed to delete motivation.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mobile-app-shell">
      <div className="mobile-app-container">

        {/* 1. HEADER */}
        <header className="profile-mobile-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <span className="profile-header-tag">ADMINISTRATION</span>
              <h1 className="profile-header-title">Motivation Library</h1>
              <p className="home-dashboard-sub" style={{ marginTop: '0.2rem' }}>
                Manage all Bible-based motivations, scriptures, reflections, and prayers.
              </p>
            </div>
            <Link
              to="/admin/motivations/new"
              className="primary-gold-cta"
              style={{ width: 'auto', padding: '0.7rem 1.25rem', fontSize: '0.88rem', textDecoration: 'none' }}
            >
              + Add Motivation
            </Link>
          </div>
        </header>

        {/* 2. ADMIN NAV TABS */}
        <AdminNav />

        {actionSuccess && (
          <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
            {actionSuccess}
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <main className="profile-mobile-content">

          {/* 3. SEARCH & FILTER CARD */}
          <section className="profile-form-card" style={{ padding: '1.15rem', marginBottom: '1.25rem' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search title, scripture reference, reflection..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ flex: '1 1 200px', padding: '0.65rem 0.9rem', fontSize: '0.88rem' }}
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-input"
                style={{ width: 'auto', padding: '0.65rem 0.9rem', fontSize: '0.88rem', minWidth: '130px' }}
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>

              <button
                type="submit"
                className="settings-reset-btn"
                style={{ borderColor: 'var(--color-gold)', color: 'var(--color-gold)', padding: '0.65rem 1.2rem', fontWeight: 600 }}
              >
                Search
              </button>

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    fetchMotivations(1, '', statusFilter);
                  }}
                  className="settings-reset-btn"
                  style={{ padding: '0.65rem 0.9rem', fontSize: '0.85rem' }}
                >
                  Clear
                </button>
              )}
            </form>
          </section>

          {/* 4. MOTIVATIONS TABLE / LIST */}
          {loading ? (
            <div className="today-mobile-loading">
              <LoadingSpinner text="Loading motivations catalog..." />
            </div>
          ) : motivations.length === 0 ? (
            <div className="today-mobile-empty-card">
              <div className="today-empty-icon">✦</div>
              <h3>No motivations found</h3>
              <p>Try adjusting your search criteria or create a new motivation entry.</p>
              <Link to="/admin/motivations/new" className="primary-gold-cta" style={{ width: 'auto', display: 'inline-block', textDecoration: 'none', marginTop: '0.75rem' }}>
                + Add New Motivation
              </Link>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '85px' }}>Day Queue</th>
                    <th>Title & Scripture</th>
                    <th>Reference</th>
                    <th>Status</th>
                    <th>Created / Updated</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {motivations.map((item, index) => {
                    const dayNum = item.day_number || index + 1;
                    const isToday = dayNum === 1;
                    const isTomorrow = dayNum === 2;

                    return (
                      <tr key={item.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                            <span 
                              style={{ 
                                display: 'inline-block', 
                                padding: '0.2rem 0.55rem', 
                                backgroundColor: 'var(--color-bg-secondary)', 
                                border: '1px solid var(--border-medium)', 
                                borderRadius: '4px', 
                                fontSize: '0.78rem', 
                                fontWeight: 700, 
                                color: 'var(--color-primary)' 
                              }}
                            >
                              Day {dayNum}
                            </span>
                            {isToday && (
                              <span 
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '0.2rem', 
                                  padding: '0.15rem 0.45rem', 
                                  backgroundColor: '#EAF4EC', 
                                  color: '#264E36', 
                                  borderRadius: '3px', 
                                  fontSize: '0.68rem', 
                                  fontWeight: 700, 
                                  textTransform: 'uppercase', 
                                  letterSpacing: '0.5px' 
                                }}
                              >
                                ☀️ Today
                              </span>
                            )}
                            {isTomorrow && (
                              <span 
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '0.2rem', 
                                  padding: '0.15rem 0.45rem', 
                                  backgroundColor: '#FFF7E6', 
                                  color: '#B87A00', 
                                  borderRadius: '3px', 
                                  fontSize: '0.68rem', 
                                  fontWeight: 700, 
                                  textTransform: 'uppercase', 
                                  letterSpacing: '0.5px' 
                                }}
                              >
                                🌅 Tomorrow
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--color-primary)', display: 'block', fontSize: '0.92rem' }}>
                            {item.title}
                          </strong>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', display: 'block', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            "{item.verse}"
                          </span>
                        </td>
                        <td>
                          <span style={{ color: 'var(--color-gold)', fontWeight: 600, fontSize: '0.85rem' }}>
                            {item.reference}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-badge badge-${item.status}`}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. PAGINATION CONTROLS */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total items)
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => fetchMotivations(pagination.page - 1)}
                  className="settings-reset-btn"
                  style={{ padding: '0.45rem 0.95rem', fontSize: '0.8rem', borderColor: 'var(--border-medium)', color: 'var(--color-text)' }}
                >
                  ← Previous
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages || loading}
                  onClick={() => fetchMotivations(pagination.page + 1)}
                  className="settings-reset-btn"
                  style={{ padding: '0.45rem 0.95rem', fontSize: '0.8rem', borderColor: 'var(--border-medium)', color: 'var(--color-text)' }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

        </main>

        {/* 6. DELETE CONFIRMATION MODAL */}
        {deletingItem && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div className="auth-card" style={{ maxWidth: '440px', width: '100%', padding: '1.5rem', margin: 0 }}>
              <h3 style={{ color: 'var(--color-error)', margin: '0 0 0.5rem 0', fontFamily: 'var(--font-serif)', fontSize: '1.25rem' }}>
                Confirm Deletion
              </h3>
              <p style={{ color: 'var(--color-text)', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 1rem 0' }}>
                Are you sure you want to permanently delete <strong>"{deletingItem.title}"</strong> ({deletingItem.reference})?
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', margin: '0 0 1.25rem 0' }}>
                Note: Motivations already delivered in user daily reading journeys cannot be deleted to protect user history. You can unpublish it instead.
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
