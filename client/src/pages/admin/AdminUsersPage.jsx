import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService.js';
import AdminNav from '../../components/AdminNav.jsx';
import BottomNavigation from '../../components/BottomNavigation.jsx';
import { LoadingSpinner } from '../../components/LoadingSpinner.jsx';

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = async (page = 1, query = searchQuery, role = roleFilter) => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.listUsers({
        page,
        limit: 10,
        q: query,
        role,
      });
      setUsers(res.data || []);
      setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.data?.message || err.message || 'Failed to fetch registered users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, searchQuery, roleFilter);
  }, [roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers(1, searchQuery, roleFilter);
  };

  return (
    <div className="mobile-app-shell">
      <div className="mobile-app-container">

        {/* 1. HEADER */}
        <header className="profile-mobile-header">
          <div>
            <span className="profile-header-tag">ADMINISTRATION</span>
            <h1 className="profile-header-title">User Management</h1>
            <p className="home-dashboard-sub" style={{ marginTop: '0.2rem' }}>
              View and manage registered Daily Grace readers and administrators.
            </p>
          </div>
        </header>

        {/* 2. ADMIN NAV TABS */}
        <AdminNav />

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <main className="profile-mobile-content">

          {/* 3. SEARCH & ROLE FILTER CARD */}
          <section className="profile-form-card" style={{ padding: '1.15rem', marginBottom: '1.25rem' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search by name or email address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ flex: '1 1 200px', padding: '0.65rem 0.9rem', fontSize: '0.88rem' }}
              />

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="form-input"
                style={{ width: 'auto', padding: '0.65rem 0.9rem', fontSize: '0.88rem', minWidth: '130px' }}
              >
                <option value="all">All Roles</option>
                <option value="user">Normal Users</option>
                <option value="admin">Administrators</option>
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
                    fetchUsers(1, '', roleFilter);
                  }}
                  className="settings-reset-btn"
                  style={{ padding: '0.65rem 0.9rem', fontSize: '0.85rem' }}
                >
                  Clear
                </button>
              )}
            </form>
          </section>

          {/* 4. USERS TABLE */}
          {loading ? (
            <div className="today-mobile-loading">
              <LoadingSpinner text="Loading registered users..." />
            </div>
          ) : users.length === 0 ? (
            <div className="today-mobile-empty-card">
              <div className="today-empty-icon">👥</div>
              <h3>No users found</h3>
              <p>No user accounts matched your search criteria.</p>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User Details</th>
                    <th>Email Address</th>
                    <th>Account Status</th>
                    <th>Role</th>
                    <th>Registered Date</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong style={{ color: 'var(--color-primary)', display: 'block', fontSize: '0.92rem' }}>
                          {u.name}
                        </strong>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                          {u.id.substring(0, 8)}…
                        </span>
                      </td>
                      <td style={{ fontSize: '0.88rem' }}>
                        <span style={{ color: 'var(--color-text)' }}>{u.email}</span>
                      </td>
                      <td>
                        <span className={`admin-badge ${u.email_verified ? 'badge-active' : 'badge-unverified'}`}>
                          {u.email_verified ? '✓ Active (Verified)' : 'Unverified'}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                          {u.role === 'admin' ? '★ Admin' : 'Reader / User'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(u.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. PAGINATION CONTROLS */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total users)
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => fetchUsers(pagination.page - 1)}
                  className="settings-reset-btn"
                  style={{ padding: '0.45rem 0.95rem', fontSize: '0.8rem', borderColor: 'var(--border-medium)', color: 'var(--color-text)' }}
                >
                  ← Previous
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages || loading}
                  onClick={() => fetchUsers(pagination.page + 1)}
                  className="settings-reset-btn"
                  style={{ padding: '0.45rem 0.95rem', fontSize: '0.8rem', borderColor: 'var(--border-medium)', color: 'var(--color-text)' }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

        </main>

        {/* 6. BOTTOM NAVIGATION */}
        <BottomNavigation />

      </div>
    </div>
  );
}
