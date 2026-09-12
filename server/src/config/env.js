import dotenv from 'dotenv';
dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

const serverUrl =
  process.env.API_BASE_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  process.env.SERVER_URL ||
  (isProd ? 'https://daily-grace.onrender.com' : 'http://localhost:5000');

const appUrl =
  process.env.APP_URL ||
  process.env.CLIENT_URL ||
  (isProd ? 'https://dailygrace.work.gd' : 'http://localhost:5173');

const rawPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '';
const cleanPass = rawPass.replace(/^["']|["']$/g, '').trim();

const rawPort = process.env.SMTP_PORT || process.env.EMAIL_PORT || '587';
const port = parseInt(rawPort, 10);
const secure = process.env.SMTP_SECURE === 'true'; // false for 587

const rawUser = process.env.SMTP_USER || process.env.EMAIL_USER || 'admindailygrace@gmail.com';
const cleanUser = rawUser.replace(/^["']|["']$/g, '').trim();

const rawHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
const cleanHost = rawHost.replace(/^["']|["']$/g, '').trim();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/daily_grace',
  jwtSecret: process.env.JWT_SECRET || 'daily_grace_fallback_secret_for_development_only',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  appUrl,
  clientUrl: appUrl,
  serverUrl,
  dailyReminderTime: process.env.DAILY_REMINDER_TIME || '05:00',
  reminderCronSchedule: process.env.REMINDER_CRON_SCHEDULE || '0 5 * * *',
  reminderTimezone: process.env.REMINDER_TIMEZONE || process.env.TIMEZONE || 'Africa/Lagos',
  enableReminderScheduler: process.env.ENABLE_REMINDER_SCHEDULER === 'true',
  email: {
    host: cleanHost,
    port,
    secure,
    user: cleanUser,
    password: cleanPass,
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || '"DAILY GRACE" <hello@dailygrace.work.gd>',
  },
  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFrom: process.env.RESEND_FROM || 'Daily Grace <onboarding@resend.dev>',
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || 'BDPaXy6CzbKkGGr7WEe5iCrr50ELCFxP6_WAt5jnlSNWIHWlTfnv-EmgDNKky37BAVpoR8dM8-t446w1HfOtnro',
    privateKey: process.env.VAPID_PRIVATE_KEY || 'isHFMQWZd53GZPv0vB76itBE7k_R28iZx8I21epvKfw',
    subject: process.env.VAPID_SUBJECT || 'mailto:hello@dailygrace.work.gd',
  },
};


