import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from '../context/NavigationContext.jsx';
import { userService } from '../services/userService.js';

export default function OnboardingTour({ onComplete }) {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userName = user?.name ? user.name.split(' ')[0] : 'friend';

  const steps = [
    {
      id: 'welcome',
      title: `Welcome to Daily Grace, ${userName}! 🌿`,
      subtitle: 'Your Daily Spiritual Sanctuary',
      badge: 'Welcome Guide',
      message: `I'm Grace, your devotional guide. Daily Grace is designed to give you a peaceful moment each morning rooted in God's Word: One Scripture, One Reflection, and One Prayer.`,
      highlight: 'Let me quickly show you how Daily Grace works so you get the most out of your daily walk.',
      icon: '🌿',
      targetPath: '/home',
    },
    {
      id: 'daily-devotion',
      title: "Today's Assigned Devotional",
      subtitle: 'Fresh Encouragement Every Morning',
      badge: 'Daily Motivation',
      message: `Every single day, you receive a carefully curated devotion tailored to uplift your spirit.`,
      highlight: 'Each devotion contains an Anchor Scripture Verse, a thoughtful Reflection for modern living, and a sincere Closing Prayer.',
      icon: '📖',
      targetPath: '/home',
    },
    {
      id: 'reminders',
      title: 'Automatic Morning Reminders',
      subtitle: 'Delivered at 05:00 AM Africa/Lagos',
      badge: 'Email Reminders',
      message: `🌿 Your morning email reminder is ALREADY ACTIVE! You don't need to click any buttons or activate anything.`,
      highlight: 'Every morning at 5:00 AM (Nigeria time), your exact assigned daily devotion will arrive quietly in your inbox.',
      icon: '✉️',
      targetPath: '/settings',
    },
    {
      id: 'history-profile',
      title: 'Devotional History & Settings',
      subtitle: 'Reflect & Personalize',
      badge: 'Preferences',
      message: `Look back on past devotions in your History, update your name in Profile, and adjust notification preferences in Settings whenever you like.`,
      highlight: 'Your journey is stored securely so you never lose track of God’s faithfulness in your life.',
      icon: '🕊️',
      targetPath: '/profile',
    },
    {
      id: 'ready',
      title: "You're All Set to Begin! ✨",
      subtitle: 'May God Bless Your Journey',
      badge: 'Ready',
      message: `Your Daily Grace journey starts right now. Open your heart, pause for a moment of stillness, and receive today’s grace.`,
      highlight: 'Your next morning devotional will arrive automatically tomorrow at 05:00 AM.',
      icon: '✨',
      targetPath: '/home',
    },
  ];

  const handleFinish = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await userService.completeOnboarding();
      updateUser({ onboarding_completed: true });
      if (onComplete) onComplete();
      navigate('/home');
    } catch (err) {
      console.warn('Failed to record onboarding completion:', err.message);
      // Fallback: update local auth context so user is never trapped
      updateUser({ onboarding_completed: true });
      if (onComplete) onComplete();
      navigate('/home');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      if (steps[nextStepIndex]?.targetPath) {
        navigate(steps[nextStepIndex].targetPath);
      }
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1;
      setCurrentStep(prevStepIndex);
      if (steps[prevStepIndex]?.targetPath) {
        navigate(steps[prevStepIndex].targetPath);
      }
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const step = steps[currentStep];

  return (
    <div
      className="onboarding-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(26, 38, 33, 0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.3s ease',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className="onboarding-card"
        style={{
          maxWidth: '460px',
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid rgba(184, 164, 106, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Top Decorative Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #354F42 0%, #25392F 100%)',
            padding: '1.5rem 1.5rem 1.25rem 1.5rem',
            position: 'relative',
            color: '#FFFFFF',
            borderBottom: '3px solid #B8A46A',
          }}
        >
          {/* Skip Button */}
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '0.8rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '999px',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'background 0.2s ease',
            }}
            aria-label="Skip Onboarding Tour"
          >
            Skip Tour
          </button>

          {/* Avatar & Badge Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Friendly Avatar */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                border: '3px solid #B8A46A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                fontSize: '2rem',
                flexShrink: 0,
              }}
            >
              {step.icon}
            </div>

            <div>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  color: '#B8A46A',
                  backgroundColor: 'rgba(184, 164, 106, 0.2)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  marginBottom: '0.25rem',
                }}
              >
                {step.badge}
              </span>
              <h2
                id="onboarding-title"
                style={{
                  margin: 0,
                  fontSize: '1.2rem',
                  fontFamily: "'Georgia', serif",
                  fontWeight: 600,
                  lineHeight: 1.25,
                  color: '#FFFFFF',
                }}
              >
                {step.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Card Body / Speech Bubble */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.95rem',
              lineHeight: 1.6,
              color: '#333333',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
          >
            {step.message}
          </p>

          <div
            style={{
              backgroundColor: '#F6F7F2',
              borderLeft: '3px solid #354F42',
              borderRadius: '0 8px 8px 0',
              padding: '0.75rem 1rem',
              fontSize: '0.85rem',
              lineHeight: 1.5,
              color: '#25392F',
              fontWeight: 500,
            }}
          >
            {step.highlight}
          </div>

          {/* Progress Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '0.5rem',
              borderTop: '1px solid #EDEDEB',
            }}
          >
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    width: idx === currentStep ? '20px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    backgroundColor: idx === currentStep ? '#354F42' : '#D0D4CD',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#888888', fontWeight: 500 }}>
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: '#354F42',
                  backgroundColor: '#F6F7F2',
                  border: '1px solid #D0D4CD',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
              >
                Back
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              style={{
                flex: 2,
                padding: '0.75rem 1.25rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#FFFFFF',
                backgroundColor: currentStep === steps.length - 1 ? '#B8A46A' : '#354F42',
                border: 'none',
                borderRadius: '8px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(53, 79, 66, 0.25)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              {isSubmitting ? (
                'Starting...'
              ) : currentStep === steps.length - 1 ? (
                'Start My Journey ✨'
              ) : (
                'Next →'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
