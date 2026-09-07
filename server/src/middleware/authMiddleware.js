import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AppError } from '../services/authService.js';
import { isValidUuid } from '../utils/cryptoUtils.js';

/**
 * Authenticates JWT token from Authorization Bearer header.
 * Ensures the token is signed, valid, and the userId payload is a valid PostgreSQL UUID.
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return next(new AppError('Authentication required. Please log in.', 401, 'UNAUTHORIZED'));
  }

  jwt.verify(token, config.jwtSecret, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Session expired. Please log in again.', 401, 'TOKEN_EXPIRED'));
      }
      return next(new AppError('Invalid authentication token.', 401, 'INVALID_TOKEN'));
    }

    if (!decoded || !decoded.userId || !isValidUuid(decoded.userId)) {
      return next(new AppError('Invalid authentication session. Please log in again.', 401, 'INVALID_TOKEN'));
    }

    req.user = decoded; // { userId, email, name, role }
    next();
  });
}

/**
 * Ensures authenticated user has 'admin' role and a valid UUID.
 */
export function requireAdmin(req, res, next) {
  if (!req.user || !req.user.userId || !isValidUuid(req.user.userId)) {
    return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
  }

  if (req.user.role !== 'admin') {
    return next(new AppError('Access forbidden. Administrator privileges required.', 403, 'FORBIDDEN'));
  }

  next();
}

