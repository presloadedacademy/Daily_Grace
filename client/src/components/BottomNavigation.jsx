import React from 'react';
import { useNavigate, useLocation } from '../context/NavigationContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function BottomNavigation() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();

  const isHomeActive = pathname === '/home' || pathname === '/';
  const isTodayActive = pathname === '/today';
  const isProfileActive = pathname === '/profile';
  const isSettingsActive = pathname === '/settings';
  const isAdminActive = pathname.startsWith('/admin');

  return (
    <nav className="bottom-nav-bar" aria-label="Mobile Navigation">
      <div className="bottom-nav-container">
        {/* Tab 1: Home */}
        <button
          className={`bottom-nav-item ${isHomeActive ? 'active' : ''}`}
          onClick={() => navigate('/home')}
          aria-label="Home"
        >
          <span className="bottom-nav-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </span>
          <span className="bottom-nav-label">Home</span>
        </button>

        {/* Tab 2: Today */}
        <button
          className={`bottom-nav-item ${isTodayActive ? 'active' : ''}`}
          onClick={() => navigate('/today')}
          aria-label="Today's Devotional"
        >
          <span className="bottom-nav-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
          </span>
          <span className="bottom-nav-label">Today</span>
        </button>

        {/* Tab 3: Profile */}
        <button
          className={`bottom-nav-item ${isProfileActive ? 'active' : ''}`}
          onClick={() => navigate('/profile')}
          aria-label="Profile"
        >
          <span className="bottom-nav-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <span className="bottom-nav-label">Profile</span>
        </button>

        {/* Tab 4: Settings (or Admin if admin user) */}
        {user?.role === 'admin' ? (
          <button
            className={`bottom-nav-item ${isAdminActive ? 'active' : ''}`}
            onClick={() => navigate('/admin')}
            aria-label="Admin Dashboard"
          >
            <span className="bottom-nav-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </span>
            <span className="bottom-nav-label">Admin</span>
          </button>
        ) : (
          <button
            className={`bottom-nav-item ${isSettingsActive ? 'active' : ''}`}
            onClick={() => navigate('/settings')}
            aria-label="Settings"
          >
            <span className="bottom-nav-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
            <span className="bottom-nav-label">Settings</span>
          </button>
        )}
      </div>
    </nav>
  );
}
