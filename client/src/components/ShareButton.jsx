import React, { useState } from 'react';
import ShareDevotionalModal from './ShareDevotionalModal.jsx';

export default function ShareButton({ motivation, variant = 'icon', className = '' }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!motivation) return null;

  const handleShareClick = async (e) => {
    e.stopPropagation();
    
    const appUrl = window.location.origin + '/today';
    const shareData = {
      title: `Daily Grace: ${motivation.title}`,
      text: `"${motivation.verse}" — ${motivation.reference}\n\n${motivation.reflection}`,
      url: appUrl,
    };

    // Use native share API on mobile browsers if available and supported
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          setIsModalOpen(true);
        }
      }
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      {variant === 'pill' ? (
        <button
          className={`share-pill-btn ${className}`}
          onClick={handleShareClick}
          title="Share on socials"
        >
          <span aria-hidden="true">📤</span>
          <span>Share</span>
        </button>
      ) : (
        <button
          className={`share-icon-btn ${className}`}
          onClick={handleShareClick}
          title="Share this message"
          aria-label="Share this motivation on socials"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
      )}

      {isModalOpen && (
        <ShareDevotionalModal
          motivation={motivation}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
