import React, { useState, useEffect } from 'react';
import { motivationService } from '../services/motivationService.js';
import TodayHeader from '../components/TodayHeader.jsx';
import DailyThemeCard from '../components/DailyThemeCard.jsx';
import VerseCard from '../components/VerseCard.jsx';
import MotivationCard from '../components/MotivationCard.jsx';
import DailyProgress from '../components/DailyProgress.jsx';
import BottomNavigation from '../components/BottomNavigation.jsx';
import DevotionalReaderModal from '../components/DevotionalReaderModal.jsx';
import ScrollToTop from '../components/ScrollToTop.jsx';
import { LoadingSpinner } from '../components/LoadingSpinner.jsx';

// Pick an aesthetic background image based on motivation ID or title
function getMotivationBg(motivation) {
  const backgrounds = [
    '/images/bg-1.jpg',
    '/images/bg-2.jpg',
    '/images/bg-3.jpg',
    '/images/bg-4.jpg',
    '/images/bg-5.jpg'
  ];
  if (!motivation || !motivation.id) return backgrounds[0];
  
  let sum = 0;
  for (let i = 0; i < motivation.id.length; i++) {
    sum += motivation.id.charCodeAt(i);
  }
  return backgrounds[sum % backgrounds.length];
}

function getFormattedDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function TodayPage() {
  const [motivation, setMotivation] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'empty' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isReaderOpen, setIsReaderOpen] = useState(false);

  const fetchTodayGrace = async () => {
    setStatus('loading');
    setErrorMessage('');
    try {
      const data = await motivationService.getTodaysMotivation();
      if (data) {
        setMotivation(data);
        setStatus('success');
      } else {
        setStatus('empty');
      }
    } catch (err) {
      if (err.code === 'NO_MOTIVATIONS_AVAILABLE' || err.status === 404) {
        setStatus('empty');
      } else {
        setStatus('error');
        setErrorMessage(
          err.message || "We couldn't load today's Grace right now."
        );
      }
    }
  };

  useEffect(() => {
    fetchTodayGrace();
  }, []);

  const bgImage = getMotivationBg(motivation);

  return (
    <div className="mobile-app-shell">
      <div className="mobile-app-container">

        {/* 1. TOP HEADER */}
        <TodayHeader />

        {/* Loading State */}
        {status === 'loading' && (
          <div className="today-mobile-loading">
            <LoadingSpinner text="Preparing today's grace..." />
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="today-mobile-empty-card">
            <div className="today-empty-icon" style={{ color: 'var(--color-error)' }}>✕</div>
            <h3>Something went wrong</h3>
            <p>{errorMessage}</p>
            <button className="primary-gold-cta" onClick={fetchTodayGrace} style={{ marginTop: '1rem' }}>
              Try Again
            </button>
          </div>
        )}

        {/* Empty Catalog State */}
        {status === 'empty' && (
          <div className="today-mobile-empty-card">
            <div className="today-empty-icon">✦</div>
            <h3>Your next Grace is being prepared</h3>
            <p>Our pastoral team is adding fresh inspirations. Please check back soon.</p>
          </div>
        )}

        {/* Main Devotional Content */}
        {status === 'success' && motivation && (
          <main className="today-mobile-feed">
            {/* 2. DAILY THEME / HERO CARD */}
            <DailyThemeCard motivation={motivation} bgImage={bgImage} />

            {/* 3. DATE SECTION */}
            <section className="today-date-section">
              <div className="today-date-left">
                <span className="today-date-text">{getFormattedDate()}</span>
                <span className="today-date-tag">TODAY'S DEVOTIONAL</span>
              </div>
              <div className="today-streak-pill" title="1 Day Devotional Streak">
                <span className="streak-icon">🔥</span>
                <span className="streak-count">1</span>
              </div>
            </section>

            {/* 4. VERSE OF THE DAY CARD (WITH SHARE BUTTON) */}
            <VerseCard 
              verse={motivation.verse} 
              reference={motivation.reference} 
              motivation={motivation}
            />

            {/* 5. DAILY MOTIVATION CARD */}
            <MotivationCard 
              motivation={motivation} 
              onOpenDevotional={() => setIsReaderOpen(true)} 
            />

            {/* 6. PROGRESS / DAILY COMPLETION (GOLD THEMED) */}
            <DailyProgress 
              isCompleted={isCompleted}
              onToggleComplete={() => setIsCompleted(!isCompleted)}
              onOpenDevotional={() => setIsReaderOpen(true)}
            />
          </main>
        )}

        {/* 7. SCROLL TO TOP FLOATING BUTTON */}
        <ScrollToTop />

        {/* 8. BOTTOM MOBILE NAVIGATION */}
        <BottomNavigation />

        {/* 9. FULL DEVOTIONAL READER MODAL */}
        {isReaderOpen && motivation && (
          <DevotionalReaderModal
            motivation={motivation}
            isCompleted={isCompleted}
            onToggleComplete={() => setIsCompleted(true)}
            onClose={() => setIsReaderOpen(false)}
            bgImage={bgImage}
          />
        )}
      </div>
    </div>
  );
}

export default TodayPage;
