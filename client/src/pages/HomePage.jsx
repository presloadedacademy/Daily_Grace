import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from '../context/NavigationContext.jsx';
import BottomNavigation from '../components/BottomNavigation.jsx';
import ScrollToTop from '../components/ScrollToTop.jsx';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function getFormattedDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const firstName = user?.name ? user.name.trim().split(' ')[0] : 'Friend';

  return (
    <div className="mobile-app-shell">
      <div className="mobile-app-container">

        {/* 1. TOP HEADER & GREETING */}
        <header className="home-dashboard-header">
          <div className="home-dashboard-header-left">
            <span className="home-dashboard-date-tag">{getFormattedDate()}</span>
            <h1 className="home-dashboard-greeting">
              {getGreeting()}, {firstName}
            </h1>
            <p className="home-dashboard-sub">
              Your daily moment with God.
            </p>
          </div>

          <div className="home-dashboard-header-right">
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

        {/* 2. WELCOME / HERO INVITATION CARD */}
        <section 
          className="home-welcome-hero-card"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(32, 32, 29, 0.3) 0%, rgba(32, 32, 29, 0.78) 100%), url('/images/bg-1.jpg')`
          }}
        >
          <div className="home-welcome-hero-content">
            <span className="home-welcome-pill">DAILY GRACE</span>
            <h2 className="home-welcome-title">Enter His Presence</h2>
            <p className="home-welcome-desc">
              Take a quiet pause in your day to nourish your spirit with God's word, heartfelt reflection, and prayer.
            </p>
          </div>
        </section>

        {/* 3. TODAY'S SNAPSHOT CARD */}
        <section className="home-snapshot-card">
          <div className="home-snapshot-badge">
            <span className="snapshot-dot">✦</span>
            <span>TODAY'S DEVOTIONAL IS READY</span>
          </div>

          <h3 className="home-snapshot-title">
            One Scripture. One Reflection. One Prayer.
          </h3>

          <p className="home-snapshot-text">
            Everything you need to center your heart on Christ today has been specially prepared for you.
          </p>

          <div className="home-snapshot-features">
            <div className="snapshot-feature-item">
              <span className="feature-icon">📖</span>
              <span className="feature-label">Bible Scripture</span>
            </div>
            <div className="snapshot-feature-item">
              <span className="feature-icon">🕊</span>
              <span className="feature-label">Spiritual Reflection</span>
            </div>
            <div className="snapshot-feature-item">
              <span className="feature-icon">🙏</span>
              <span className="feature-label">Daily Prayer</span>
            </div>
          </div>

          {/* PRIMARY ACTION CTA */}
          <button
            id="begin-today-grace-btn"
            className="home-begin-cta-btn"
            onClick={() => navigate('/today')}
          >
            <span>Begin Today's Grace</span>
            <span className="home-cta-arrow" aria-hidden="true">→</span>
          </button>
        </section>

        {/* 4. CALM SPIRITUAL ANCHOR */}
        <footer className="home-anchor-footer">
          <p>
            "Be still, and know that I am God."
          </p>
          <span>— Psalm 46:10</span>
        </footer>

        {/* 5. SCROLL TO TOP & BOTTOM NAVIGATION */}
        <ScrollToTop />
        <BottomNavigation />

      </div>
    </div>
  );
}

export default HomePage;
