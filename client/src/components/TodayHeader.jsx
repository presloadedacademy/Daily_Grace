import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from '../context/NavigationContext.jsx';

export default function TodayHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const firstName = user?.name ? user.name.trim().split(' ')[0] : 'Friend';

  return (
    <header className="today-header">
      <div className="today-header-left">
        <h1 className="today-header-greeting">
          {getGreeting()}, {firstName}
        </h1>
        <p className="today-header-sub">
          A new day, a new opportunity to grow in grace.
        </p>
      </div>

      <div className="today-header-right">
        <button
          className="today-avatar-btn"
          onClick={() => navigate('/profile')}
          title="Your Profile"
          aria-label="Profile and Settings"
        >
          <span className="today-avatar-initial">
            {firstName.charAt(0).toUpperCase()}
          </span>
          <span className="today-avatar-badge" aria-hidden="true">🕊</span>
        </button>
      </div>
    </header>
  );
}
