import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Link, useNavigate } from '../context/NavigationContext.jsx';

export default function AdminRoute({ children }) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <p className="auth-subtitle">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  if (user.role !== 'admin') {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center', maxWidth: '480px' }}>
          <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>🔒</span>
          <h2 className="auth-title" style={{ color: 'var(--primary)', marginBottom: '8px' }}>
            Access Restricted
          </h2>
          <p className="auth-subtitle" style={{ marginBottom: '24px' }}>
            This area requires administrator privileges. Your account does not have access to the administration dashboard.
          </p>
          <Link to="/home" className="btn btn-primary" style={{ display: 'inline-block' }}>
            Return to Daily Grace
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
