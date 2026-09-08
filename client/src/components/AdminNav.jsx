import React from 'react';
import { Link, useLocation, useNavigate } from '../context/NavigationContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminNav() {
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const isDashboard = pathname === '/admin';
  const isMotivations = pathname.startsWith('/admin/motivations');
  const isUsers = pathname === '/admin/users';
  const isProfile = pathname === '/admin/profile';
  const isSettings = pathname === '/admin/settings';

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="admin-nav-tabs" aria-label="Admin Navigation Tabs" style={{ display: 'flex', alignItems: 'center' }}>
      <Link to="/admin" className={`admin-tab-btn ${isDashboard ? 'active' : ''}`}>
        <span>📊</span> Overview
      </Link>
      <Link to="/admin/motivations" className={`admin-tab-btn ${isMotivations ? 'active' : ''}`}>
        <span>📖</span> Motivations
      </Link>
      <Link to="/admin/users" className={`admin-tab-btn ${isUsers ? 'active' : ''}`}>
        <span>👥</span> Users
      </Link>
      <Link to="/admin/profile" className={`admin-tab-btn ${isProfile ? 'active' : ''}`}>
        <span>👤</span> Profile
      </Link>
      <Link to="/admin/settings" className={`admin-tab-btn ${isSettings ? 'active' : ''}`}>
        <span>⚙️</span> Settings
      </Link>
      <button
        type="button"
        onClick={handleSignOut}
        className="admin-tab-btn"
        title="Sign Out"
        style={{
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: '#C53030',
          marginLeft: 'auto',
          fontSize: '0.82rem',
          fontWeight: 600,
        }}
      >
        <span>🚪</span> Sign Out
      </button>
    </nav>
  );
}
