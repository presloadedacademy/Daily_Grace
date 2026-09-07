import React, { useState } from 'react';

export default function ShareDevotionalModal({ motivation, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!motivation) return null;

  const appUrl = window.location.origin + '/today';
  const shareText = `🕊 Daily Grace • "${motivation.title}"\n\n"${motivation.verse}"\n— ${motivation.reference}\n\n${motivation.reflection}\n\nRead more at: ${appUrl}`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(appUrl);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const shareToWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  const shareToTwitter = () => {
    const tweetText = encodeURIComponent(`"${motivation.verse}" — ${motivation.reference}\n\nDaily Grace: ${motivation.title}`);
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}&url=${encodedUrl}`, '_blank');
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-content share-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <div>
            <span className="profile-header-tag">SPREAD THE WORD</span>
            <h3 className="share-modal-title">Share Today's Grace</h3>
          </div>
          <button className="share-modal-close" onClick={onClose} aria-label="Close share modal">
            ✕
          </button>
        </div>

        {/* Message Preview */}
        <div className="share-preview-card">
          <blockquote className="share-preview-verse">
            “{motivation.verse}”
          </blockquote>
          <cite className="share-preview-ref">— {motivation.reference}</cite>
        </div>

        {/* Share Channels Grid */}
        <div className="share-channels-grid">
          {/* WhatsApp */}
          <button className="share-channel-btn whatsapp" onClick={shareToWhatsApp}>
            <span className="channel-icon">💬</span>
            <span className="channel-name">WhatsApp</span>
          </button>

          {/* Twitter / X */}
          <button className="share-channel-btn twitter" onClick={shareToTwitter}>
            <span className="channel-icon">𝕏</span>
            <span className="channel-name">X (Twitter)</span>
          </button>

          {/* Facebook */}
          <button className="share-channel-btn facebook" onClick={shareToFacebook}>
            <span className="channel-icon">📘</span>
            <span className="channel-name">Facebook</span>
          </button>
        </div>

        {/* Copy to Clipboard */}
        <div className="share-copy-wrapper">
          <button 
            className={`share-copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
          >
            <span className="copy-icon">{copied ? '✓' : '📋'}</span>
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Full Message & Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
