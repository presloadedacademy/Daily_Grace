import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/userRepository.js';
import { emailService } from './emailService.js';
import { generateRandomToken, hashToken, isValidUuid } from '../utils/cryptoUtils.js';
import { config } from '../config/env.js';

export class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_EXPIRY_HOURS = 24;

export class AuthService {
  /**
   * Register a new user and dispatch a verification email.
   */
  static async register({ name, email, password, confirmPassword }) {
    if (!name || !name.trim()) {
      throw new AppError('Full name is required.', 400, 'VALIDATION_ERROR');
    }
    if (name.trim().length < 2) {
      throw new AppError('Name must be at least 2 characters long.', 400, 'VALIDATION_ERROR');
    }

    if (!email || !email.trim()) {
      throw new AppError('Email address is required.', 400, 'VALIDATION_ERROR');
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      throw new AppError('Please enter a valid email address.', 400, 'VALIDATION_ERROR');
    }

    if (!password) {
      throw new AppError('Password is required.', 400, 'VALIDATION_ERROR');
    }
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters long.', 400, 'VALIDATION_ERROR');
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      throw new AppError('Passwords do not match.', 400, 'VALIDATION_ERROR');
    }

    // Check if user already exists
    const existingUser = await UserRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new AppError('An account with this email already exists.', 409, 'EMAIL_EXISTS');
    }

    // Hash password with bcrypt (12 salt rounds)
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate cryptographically secure verification token (32 bytes)
    const rawVerificationToken = generateRandomToken(32);
    const verificationTokenHash = hashToken(rawVerificationToken);
    const verificationTokenExpiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Persist new user record (email_verified starts as false for optional profile verification)
    const newUser = await UserRepository.createUser({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      verificationTokenHash,
      verificationTokenExpiresAt,
      emailVerified: false,
    });

    // Non-blocking asynchronous email dispatch so registration API responds in under 200ms
    emailService.sendWelcomeEmail(newUser).catch((err) => {
      console.error('Failed to send welcome email:', err);
    });

    // Generate JWT token for immediate authenticated session
    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role || 'user',
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return {
      success: true,
      token,
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      email_verified: Boolean(newUser.email_verified),
      onboarding_completed: Boolean(newUser.onboarding_completed),
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role || 'user',
        email_verified: Boolean(newUser.email_verified),
        notification_enabled: Boolean(newUser.notification_enabled),
        onboarding_completed: Boolean(newUser.onboarding_completed),
      },
      message: 'Account created successfully!',
    };
  }



  /**
   * Generate and send a 6-digit verification OTP to the user's email.
   */
  static async sendVerificationOTP(userId) {
    if (!userId || !isValidUuid(userId)) {
      throw new AppError('Invalid authentication session. Please log in again.', 401, 'INVALID_TOKEN');
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new AppError('User account not found.', 404, 'USER_NOT_FOUND');
    }

    if (user.email_verified && user.is_verified) {
      return {
        success: true,
        message: 'Your email address is already verified.',
        alreadyVerified: true,
      };
    }

    // Generate random 6-digit numeric OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await UserRepository.updateVerificationOtp(user.id, otp, expiresAt);

    await emailService.sendVerificationOtpEmail({
      to: user.email,
      name: user.name,
      otp,
    });

    return {
      success: true,
      message: `Verification code sent to ${user.email}.`,
      expiresInMinutes: 10,
    };
  }

  /**
   * Verify an email address using the 6-digit OTP.
   */
  static async verifyEmailOTP(userId, code) {
    if (!userId || !isValidUuid(userId)) {
      throw new AppError('Invalid authentication session. Please log in again.', 401, 'INVALID_TOKEN');
    }

    if (code === undefined || code === null || code === '') {
      throw new AppError('Please enter the 6-digit verification code.', 400, 'MISSING_OTP');
    }

    const cleanCode = String(code).trim();
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      throw new AppError('Verification code must be exactly 6 digits.', 400, 'INVALID_OTP');
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new AppError('User account not found.', 404, 'USER_NOT_FOUND');
    }

    if (user.email_verified && user.is_verified) {
      return {
        success: true,
        message: 'Your email is already verified.',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'user',
          email_verified: true,
          is_verified: true,
          notification_enabled: Boolean(user.notification_enabled),
          onboarding_completed: Boolean(user.onboarding_completed),
        },
      };
    }

    if (!user.verification_otp || !user.verification_otp_expires_at) {
      throw new AppError('No active verification code found. Please request a new code.', 400, 'NO_OTP_FOUND');
    }

    const now = new Date();
    const expiresAt = new Date(user.verification_otp_expires_at);

    if (now > expiresAt) {
      throw new AppError('This verification code has expired. Please request a new code.', 400, 'EXPIRED_OTP');
    }

    if (user.verification_otp !== cleanCode) {
      throw new AppError('Invalid verification code. Please check and try again.', 400, 'INVALID_OTP');
    }

    // Mark email verified and clear OTP
    const updatedUser = await UserRepository.markEmailVerified(user.id);

    return {
      success: true,
      message: 'Email verified successfully!',
      user: {
        id: updatedUser?.id || user.id,
        name: updatedUser?.name || user.name,
        email: updatedUser?.email || user.email,
        role: updatedUser?.role || user.role || 'user',
        email_verified: true,
        is_verified: true,
        notification_enabled: Boolean(updatedUser?.notification_enabled ?? user.notification_enabled),
        onboarding_completed: Boolean(updatedUser?.onboarding_completed ?? user.onboarding_completed),
      },
    };
  }

  /**
   * Verify an email address using the received token.
   */
  static async verifyEmail(token) {
    if (!token || typeof token !== 'string') {
      throw new AppError('Verification token is required.', 400, 'MISSING_TOKEN');
    }

    const tokenHash = hashToken(token.trim());
    const user = await UserRepository.findByVerificationTokenHash(tokenHash);

    if (!user) {
      throw new AppError('This verification link is invalid or has expired.', 400, 'INVALID_OR_USED_TOKEN');
    }

    // Check token expiration
    const now = new Date();
    const expiresAt = new Date(user.verification_token_expires_at);

    if (expiresAt < now) {
      throw new AppError('This verification link has expired. Please request a new one.', 400, 'EXPIRED_TOKEN');
    }

    // Mark email verified and clear token
    await UserRepository.markEmailVerified(user.id);

    return {
      success: true,
      message: 'Your email has been successfully confirmed.',
    };
  }

  /**
   * Resend a verification email.
   */
  static async resendVerification(email) {
    if (!email || !email.trim()) {
      throw new AppError('Email address is required.', 400, 'VALIDATION_ERROR');
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      throw new AppError('Please enter a valid email address.', 400, 'VALIDATION_ERROR');
    }

    const user = await UserRepository.findByEmail(normalizedEmail);

    // Generic response for security to prevent user enumeration
    const genericResponse = {
      success: true,
      message: 'If an account exists for this email address, a verification email has been sent.',
    };

    if (!user) {
      return genericResponse;
    }


    // Generate new token & hash, invalidating previous token
    const rawToken = generateRandomToken(32);
    const verificationTokenHash = hashToken(rawToken);
    const verificationTokenExpiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await UserRepository.updateVerificationToken(user.id, verificationTokenHash, verificationTokenExpiresAt);

    await emailService.sendVerificationEmail({
      to: user.email,
      name: user.name,
      token: rawToken,
    });

    return genericResponse;
  }

  /**
   * Authenticate a user and return a JWT token.
   */
  static async login({ email, password }) {
    if (!email || !password) {
      throw new AppError('Email and password are required.', 400, 'VALIDATION_ERROR');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await UserRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new AppError('No account found with this email address. Please check the spelling or register.', 404, 'USER_NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError('Incorrect password. Please try again or reset your password.', 401, 'INVALID_PASSWORD');
    }

    // Generate JWT token including role
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user',
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        email_verified: Boolean(user.email_verified),
        notification_enabled: Boolean(user.notification_enabled),
        onboarding_completed: Boolean(user.onboarding_completed),
      },
    };
  }


  /**
   * Get current authenticated user profile.
   */
  static async getMe(userId) {
    if (!userId || !isValidUuid(userId)) {
      throw new AppError('Invalid authentication session. Please log in again.', 401, 'INVALID_TOKEN');
    }
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new AppError('User account not found.', 404, 'NOT_FOUND');
    }
    return user;
  }
}

