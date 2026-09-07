import dotenv from 'dotenv';
dotenv.config();

const appUrl = process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:5173';

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/daily_grace',
  jwtSecret: process.env.JWT_SECRET || 'daily_grace_fallback_secret_for_development_only',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  appUrl,
  clientUrl: appUrl,
  serverUrl: process.env.SERVER_URL || 'http://localhost:5000',
  dailyReminderTime: process.env.DAILY_REMINDER_TIME || '08:00',
  reminderTimezone: process.env.REMINDER_TIMEZONE || process.env.TIMEZONE || 'Africa/Lagos',
  enableReminderScheduler: process.env.ENABLE_REMINDER_SCHEDULER === 'true',
  email: {
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST || '',
    port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '465', 10),
    secure: (process.env.SMTP_SECURE || process.env.EMAIL_SECURE) === 'true' || (process.env.SMTP_PORT || process.env.EMAIL_PORT) === '465',
    user: process.env.SMTP_USER || process.env.EMAIL_USER || '',
    password: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD || '',
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || '"DAILY GRACE" <_mainaccount@dailygrace.work.gd>',
  },
};


