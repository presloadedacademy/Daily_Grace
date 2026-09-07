import { AppError } from '../services/authService.js';
import { config } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Known operational errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
    });
  }

  // Handle PostgreSQL specific errors securely
  if (err.code === '23505') {
    // Unique violation
    return res.status(409).json({
      success: false,
      code: 'DUPLICATE_RESOURCE',
      message: 'An account with this information already exists.',
    });
  }

  // Handle JWT errors if caught here
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Invalid authentication token.',
    });
  }

  // Log unexpected errors server-side without leaking sensitive internal details to the client
  console.error('[Unhandled Server Error]', {
    path: req.path,
    method: req.method,
    message: err.message,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
  });

  return res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred. Please try again later.',
  });
}
