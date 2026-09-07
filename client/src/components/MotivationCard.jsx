import React from 'react';

export default function MotivationCard({ motivation, onOpenDevotional }) {
  if (!motivation) return null;

  // Determine category badge name
  const categoryName = motivation.category 
    ? motivation.category.toUpperCase() 
    : 'REFLECTION';

  return (
    <section className="motivation-card" onClick={onOpenDevotional}>
      <div className="motivation-card-top">
        <span className="motivation-badge">
          {categoryName}
        </span>
        <span className="motivation-read-pill">
          Read Devotional →
        </span>
      </div>

      <h3 className="motivation-card-title">
        {motivation.title}
      </h3>

      <p className="motivation-card-desc">
        {motivation.reflection 
          ? (motivation.reflection.length > 140 
              ? `${motivation.reflection.substring(0, 140)}...` 
              : motivation.reflection)
          : "Choose to abide in God's peace today, letting your heart rest in His promises."}
      </p>
    </section>
  );
}
