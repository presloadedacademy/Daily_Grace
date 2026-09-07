import React from 'react';

export default function DailyProgress({ isCompleted, onToggleComplete, onOpenDevotional }) {
  return (
    <section className="daily-progress-card gold-theme">
      <div 
        className="daily-progress-left"
        onClick={onOpenDevotional}
        style={{ cursor: onOpenDevotional ? 'pointer' : 'default', flex: 1 }}
      >
        <div className={`daily-progress-icon-box gold-icon-box ${isCompleted ? 'completed' : ''}`}>
          {isCompleted ? '✓' : '✦'}
        </div>
        <div>
          <h4 className="daily-progress-title gold-text">Today's Journey</h4>
          <p className="daily-progress-status gold-subtext">
            {isCompleted ? '1 of 1 completed for today' : 'Daily grace ready to read'}
          </p>
        </div>
      </div>

      <div className="daily-progress-right">
        {isCompleted ? (
          <span className="daily-progress-badge-completed gold-completed-badge">
            ✓ Completed
          </span>
        ) : (
          <button 
            className="daily-progress-mark-btn gold-mark-btn"
            onClick={onToggleComplete}
            title="Mark as completed"
          >
            Mark Done
          </button>
        )}
      </div>
    </section>
  );
}
