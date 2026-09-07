import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Link, useNavigate, useLocation } from '../context/NavigationContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => pathname === path ? 'nav-link active' : 'nav-link';

  return (
    <header className="navbar">
      <Link to="/home" className="nav-brand">
        Daily Grace
      </Link>

      <nav className="nav-links">
        <Link to="/home" className={isActive('/home')}>
          Home
        </Link>
        <Link to="/today" className={isActive('/today')}>
          Today
        </Link>
        <Link to="/profile" className={isActive('/profile')}>
          Profile
        </Link>
        <Link to="/settings" className={isActive('/settings')}>
          Settings
        </Link>
        {user && user.role === 'admin' && (
          <Link
            to="/admin"
            className="nav-link"
            style={{ color: 'var(--color-accent)', fontWeight: 600 }}
          >
            Admin
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="nav-link"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: '0.5rem 0.85rem',
          }}
        >
          Sign Out
        </button>
      </nav>
    </header>
  );
}
