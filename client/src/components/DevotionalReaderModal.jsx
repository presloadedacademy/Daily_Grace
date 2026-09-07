import React from 'react';
import ShareButton from './ShareButton.jsx';

export default function DevotionalReaderModal({ motivation, isCompleted, onToggleComplete, onClose, bgImage = '/images/bg-1.jpg' }) {
  if (!motivation) return null;

  return (
    <div className="devotional-modal-overlay" role="dialog" aria-modal="true">
      <div className="devotional-modal-container">
        {/* Top Sticky Bar */}
        <div className="devotional-modal-header">
          <button 
            className="devotional-modal-back-btn"
            onClick={onClose}
            aria-label="Back to overview"
          >
            ← Back
          </button>
          <span className="devotional-modal-header-title">Daily Grace</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShareButton motivation={motivation} />
            <button 
              className="devotional-modal-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Reader Content */}
        <div className="devotional-modal-body">
          {/* Hero Banner with background */}
          <div 
            className="devotional-modal-hero"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(32,32,29,0.3) 0%, rgba(32,32,29,0.8) 100%), url(${bgImage})`
            }}
          >
            <span className="devotional-modal-hero-badge">
              TODAY'S DEVOTIONAL
            </span>
            <h1 className="devotional-modal-hero-title">
              {motivation.title}
            </h1>
          </div>

          <article className="devotional-modal-content">
            {/* 1. Scripture Section */}
            <section className="devotional-reader-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <h2 className="devotional-reader-heading" style={{ marginBottom: 0 }}>Scripture</h2>
                <ShareButton motivation={motivation} variant="pill" />
              </div>
              <div className="devotional-reader-verse-card">
                <blockquote className="devotional-reader-verse-text">
                  “{motivation.verse}”
                </blockquote>
                <cite className="devotional-reader-verse-ref">
                  — {motivation.reference}
                </cite>
              </div>
            </section>

            {/* 2. Reflection Section */}
            <section className="devotional-reader-section">
              <h2 className="devotional-reader-heading">Today's Reflection</h2>
              <p className="devotional-reader-reflection-text">
                {motivation.reflection}
              </p>
            </section>

            {/* 3. Prayer Section */}
            <section className="devotional-reader-section">
              <h2 className="devotional-reader-heading">Today's Prayer</h2>
              <div className="devotional-reader-prayer-box">
                <p className="devotional-reader-prayer-text">
                  {motivation.prayer}
                </p>
              </div>
            </section>

            {/* Completion & Share Actions */}
            <div className="devotional-reader-complete-section">
              {!isCompleted ? (
                <button
                  id="modal-mark-complete-btn"
                  className="devotional-reader-complete-btn"
                  onClick={onToggleComplete}
                >
                  ✓ Mark as Complete
                </button>
              ) : (
                <div className="devotional-reader-completed-alert">
                  <span className="completed-icon">✓</span>
                  <div>
                    <strong>Grace received for today.</strong>
                    <p>May His word guide your steps throughout this day.</p>
                  </div>
                </div>
              )}
            </div>

            <footer className="devotional-reader-footer">
              <p>“Your word is a lamp to my feet and a light to my path.”</p>
              <span>— Psalm 119:105</span>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
}
