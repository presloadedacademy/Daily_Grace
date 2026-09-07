import React from 'react';
import ShareButton from './ShareButton.jsx';

export default function VerseCard({ verse, reference, motivation }) {
  if (!verse) return null;

  const motivationData = motivation || { verse, reference, title: 'Verse of the Day' };

  return (
    <section className="verse-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
        <div className="verse-card-badge" style={{ marginBottom: 0 }}>
          <span className="verse-card-icon" aria-hidden="true">📖</span>
          <span className="verse-card-label">Verse of the Day</span>
        </div>

        <ShareButton motivation={motivationData} />
      </div>

      <blockquote className="verse-card-text">
        “{verse}”
      </blockquote>

      {reference && (
        <cite className="verse-card-reference">
          {reference.toUpperCase()}
        </cite>
      )}
    </section>
  );
}
