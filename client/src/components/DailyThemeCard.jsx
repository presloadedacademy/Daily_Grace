import React from 'react';

export default function DailyThemeCard({ motivation, bgImage = '/images/bg-1.jpg' }) {
  if (!motivation) return null;

  // Derive category or default to TODAY'S REFLECTION
  const categoryLabel = motivation.category 
    ? `THEME • ${motivation.category.toUpperCase()}`
    : "TODAY'S REFLECTION";

  return (
    <section 
      className="hero-theme-card"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(32, 32, 29, 0.25) 0%, rgba(32, 32, 29, 0.72) 100%), url(${bgImage})`
      }}
    >
      <div className="hero-theme-content">
        <span className="hero-theme-pill">
          {categoryLabel}
        </span>

        <h2 className="hero-theme-title">
          {motivation.title}
        </h2>

        <p className="hero-theme-desc">
          {motivation.reflection 
            ? (motivation.reflection.length > 110 
                ? `${motivation.reflection.substring(0, 110)}...` 
                : motivation.reflection)
            : "Let your life reflect the peace and truth you have received from God."}
        </p>
      </div>
    </section>
  );
}
