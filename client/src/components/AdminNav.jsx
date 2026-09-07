import React from 'react';
import { Link, useLocation } from '../context/NavigationContext.jsx';

export default function AdminNav() {
  const { pathname } = useLocation();

  const isDashboard = pathname === '/admin';
  const isMotivations = pathname.startsWith('/admin/motivations');
  const isUsers = pathname === '/admin/users';
  const isProfile = pathname === '/admin/profile';
  const isSettings = pathname === '/admin/settings';

  return (
    <nav className="admin-nav-tabs" aria-label="Admin Navigation Tabs">
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
        <span>👤</span> Admin Profile
      </Link>
      <Link to="/admin/settings" className={`admin-tab-btn ${isSettings ? 'active' : ''}`}>
        <span>⚙️</span> Settings
      </Link>
    </nav>
  );
}
