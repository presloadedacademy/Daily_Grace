import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import { LoadingSpinner } from './LoadingSpinner.jsx';

export default function OtpVerificationModal({ email, isOpen, onClose, onSuccess }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState(null);
  const [resendSuccess, setResendSuccess] = useState(null);

  const inputRefs = useRef([]);

  // Reset state and focus first box when modal opens
  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', '']);
      setError(null);
      setResendSuccess(null);
      setCountdown(60);
      const timer = setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Countdown timer for resend button
  useEffect(() => {
    if (!isOpen || countdown <= 0) return;

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
  }, [isOpen, countdown]);

  if (!isOpen) return null;

  const handleDigitChange = (index, value) => {
    setError(null);
    setResendSuccess(null);

    // Only allow numeric input
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    // If user typed or pasted multiple digits in one box
    if (cleanVal.length > 1) {
      handlePastedCode(cleanVal, index);
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleanVal.slice(-1);
    setDigits(newDigits);

    // Auto-advance to next input
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if code is complete
    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !newDigits.includes('')) {
      submitVerification(fullCode);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (digits[index] === '' && index > 0) {
        // Move to previous input and clear it
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
      if (onSuccess) {
        onSuccess(response.user || response);
      }
    } catch (err) {
      setError(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;

    setIsResending(true);
    setError(null);
    setResendSuccess(null);

    try {
      await api.sendVerificationOtp();
      setResendSuccess('A new verification code has been sent to your email.');
      setCountdown(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const formattedTimer = `00:${String(countdown).padStart(2, '0')}`;
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
            Please enter the code we just sent to <strong className="otp-email-highlight">{email}</strong>
          </p>
        </div>

        {/* Alert Feedback */}
        {error && (
          <div className="otp-alert otp-alert-error" role="alert">
            <span className="otp-alert-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {resendSuccess && (
          <div className="otp-alert otp-alert-success" role="status">
            <span className="otp-alert-icon">✓</span>
            <span>{resendSuccess}</span>
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
              disabled={isVerifying}
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
            disabled={!isComplete || isVerifying}
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
              disabled={isResending}
            >
              {isResending ? 'Sending new code...' : 'Resend Code'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
