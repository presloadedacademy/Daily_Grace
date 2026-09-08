import React from 'react';
import { useNavigate } from '../context/NavigationContext.jsx';

export default function ForegroundNotificationToast({ notification, onDismiss }) {
  const navigate = useNavigate();

  if (!notification) return null;

  const handleOpen = () => {
    onDismiss();
    const url = notification.url || '/today';
    navigate(url);
  };

  return (
    <div className="foreground-toast-banner" role="alert">
      <div className="foreground-toast-icon">🌿</div>
      <div className="foreground-toast-content" onClick={handleOpen}>
        <h4 className="foreground-toast-title">
          {notification.title || 'Daily Grace 🌿'}
        </h4>
        <p className="foreground-toast-body">
          {notification.body || "Today's devotional is ready for you."}
        </p>
      </div>
      <div className="foreground-toast-actions">
        <button 
          className="foreground-toast-read-btn"
          onClick={handleOpen}
          aria-label="Read today's devotional"
        >
          Read Now
        </button>
        <button 
          className="foreground-toast-close-btn"
          onClick={onDismiss}
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
