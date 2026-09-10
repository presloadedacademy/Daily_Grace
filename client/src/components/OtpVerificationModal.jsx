import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import { LoadingSpinner } from './LoadingSpinner.jsx';

export default function OtpVerificationModal({
  email,
  userEmail,
  isOpen = false,
  open = false,
  onClose,
  onSuccess,
  onVerified,
}) {
  const targetEmail = email || userEmail || '';
  const isModalOpen = Boolean(isOpen || open);
  const handleSuccess = onSuccess || onVerified;

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const [isSendingInitial, setIsSendingInitial] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const inputRefs = useRef([]);

  // Trigger real send request when modal opens
  useEffect(() => {
    let isMounted = true;

    if (isModalOpen) {
      setDigits(['', '', '', '', '', '']);
      setError(null);
      setStatusMessage(null);
      setCountdown(0);
      setIsSendingInitial(true);

      api
        .sendVerificationOtp()
        .then(() => {
          if (!isMounted) return;
          setIsSendingInitial(false);
          setStatusMessage('Code sent!');
          setCountdown(60);
          setError(null);
        })
        .catch((err) => {
          if (!isMounted) return;
          setIsSendingInitial(false);
          setStatusMessage(null);
          setError(err.message || 'Failed to send email. Please check your connection or try again.');
        });

      const focusTimer = setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 150);

      return () => {
        isMounted = false;
        clearTimeout(focusTimer);
      };
    }
  }, [isModalOpen]);

  // 60-second countdown timer
  useEffect(() => {
    if (!isModalOpen || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isModalOpen, countdown]);

  if (!isModalOpen) return null;

  const handleDigitChange = (index, value) => {
    setError(null);

    // Only allow numeric input
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    if (cleanVal.length > 1) {
      handlePastedCode(cleanVal, index);
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleanVal.slice(-1);
    setDigits(newDigits);

    // Auto-advance
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 filled
    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !newDigits.includes('')) {
      submitVerification(fullCode);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (digits[index] === '' && index > 0) {
        e.preventDefault();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePastedCode = (pastedText, startIndex = 0) => {
    const numbersOnly = pastedText.replace(/\D/g, '').slice(0, 6);
    if (!numbersOnly) return;

    const newDigits = [...digits];
    for (let i = 0; i < numbersOnly.length && startIndex + i < 6; i++) {
      newDigits[startIndex + i] = numbersOnly[i];
    }
    setDigits(newDigits);

    const nextIndex = Math.min(startIndex + numbersOnly.length, 5);
    inputRefs.current[nextIndex]?.focus();

    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !newDigits.includes('')) {
      submitVerification(fullCode);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    handlePastedCode(pastedData, 0);
  };

  const submitVerification = async (codeToVerify) => {
    const code = codeToVerify || digits.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await api.verifyEmailOtp(code);
      if (handleSuccess) {
        handleSuccess(response.user || response);
      }
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending || isSendingInitial) return;

    setIsResending(true);
    setError(null);
    setStatusMessage(null);

    try {
      await api.sendVerificationOtp();
      setStatusMessage('Code sent!');
      setCountdown(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message || 'Failed to send email. Please check your connection or try again.');
    } finally {
      setIsResending(false);
    }
  };

  const formattedTimer = `${String(Math.floor(countdown / 60)).padStart(2, '0')}:${String(countdown % 60).padStart(2, '0')}`;
  const isComplete = digits.join('').length === 6 && !digits.includes('');

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-content otp-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          className="share-modal-close otp-modal-close"
          onClick={onClose}
          aria-label="Close verification modal"
        >
          ✕
        </button>

        {/* Top Icon */}
        <div className="otp-icon-wrapper">
          <div className="otp-icon-badge">
            <span className="otp-icon-emoji" role="img" aria-label="Mailbox">
              📬
            </span>
          </div>
        </div>

        {/* Header Titles */}
        <div className="otp-header-text">
          <h3 className="otp-modal-title">Email code</h3>
          <p className="otp-modal-subtitle">
            Please enter the code we just sent to <strong className="otp-email-highlight">{targetEmail}</strong>
          </p>

          {/* Dynamic Status / Sending Indicator */}
          <div style={{ minHeight: '26px', marginTop: '0.45rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {isSendingInitial && (
              <span className="otp-status-badge otp-status-sending">
                <LoadingSpinner size="small" color="#2D4A3E" />
                <span>Sending code...</span>
              </span>
            )}
            {!isSendingInitial && statusMessage && (
              <span className="otp-status-badge">
                ✓ {statusMessage}
              </span>
            )}
          </div>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="otp-alert otp-alert-error" role="alert">
            <span className="otp-alert-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* 6 Digit Input Boxes */}
        <div className="otp-inputs-grid" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`otp-digit-input ${digit ? 'filled' : ''} ${error ? 'has-error' : ''}`}
              autoComplete="one-time-code"
              disabled={isVerifying || isSendingInitial}
              aria-label={`Digit ${index + 1} of verification code`}
            />
          ))}
        </div>

        {/* Action Button */}
        <div className="otp-actions-wrapper">
          <button
            type="button"
            className="otp-verify-btn"
            onClick={() => submitVerification()}
            disabled={!isComplete || isVerifying || isSendingInitial}
          >
            {isVerifying ? (
              <span className="otp-btn-loading">
                <LoadingSpinner size="small" color="#FFFFFF" />
                <span>Verifying...</span>
              </span>
            ) : (
              <span>Verify</span>
            )}
          </button>
        </div>

        {/* Resend & Countdown Section */}
        <div className="otp-resend-wrapper">
          {countdown > 0 ? (
            <span className="otp-timer-text">
              Request a new code in <strong className="otp-timer-count">{formattedTimer}</strong>
            </span>
          ) : (
            <button
              type="button"
              className="otp-resend-btn"
              onClick={handleResend}
              disabled={isResending || isSendingInitial}
            >
              {isResending ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <LoadingSpinner size="small" color="#2D4A3E" />
                  <span>Sending...</span>
                </span>
              ) : (
                'Resend Code'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
