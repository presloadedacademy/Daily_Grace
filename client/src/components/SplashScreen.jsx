import { useEffect, useState } from 'react';
import './SplashScreen.css';

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState('visible'); // 'visible' | 'fade-out'

  useEffect(() => {
    // After 2.4s start fading, then call onComplete
    const fadeTimer = setTimeout(() => setPhase('fade-out'), 2400);
    const doneTimer = setTimeout(() => onComplete && onComplete(), 3000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div className={`splash-root ${phase === 'fade-out' ? 'splash-fade-out' : ''}`}>
      {/* Background subtle texture */}
      <div className="splash-bg-gradient" />

      {/* Cross subtle watermark */}
      <div className="splash-cross-mark">✦</div>

      {/* Content */}
      <div className="splash-content">
        {/* Logo / Icon */}
        <div className="splash-logo-wrap">
          <div className="splash-logo-ring">
            <span className="splash-logo-icon">☩</span>
          </div>
          <div className="splash-logo-glow" />
        </div>

        {/* App Name */}
        <h1 className="splash-app-name">Daily Grace</h1>

        {/* Tagline */}
        <p className="splash-tagline">Your daily moment with God</p>

        {/* Loading dots */}
        <div className="splash-dots">
          <span className="splash-dot" style={{ animationDelay: '0s' }} />
          <span className="splash-dot" style={{ animationDelay: '0.2s' }} />
          <span className="splash-dot" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>

      {/* Bottom verse */}
      <p className="splash-verse">"His mercies are new every morning." — Lam 3:23</p>
    </div>
  );
}
