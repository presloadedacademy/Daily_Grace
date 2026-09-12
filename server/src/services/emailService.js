import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { config } from '../config/env.js';

const resend = new Resend(process.env.RESEND_API_KEY || config.resendApiKey || '');

class EmailService {
  constructor() {
    this.transporter = null;
  }

  getTransporter() {
    const rawPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || config.email.password || 'otmfggitucaanpfz';
    const cleanPass = rawPass.replace(/^["']|["']$/g, '').trim();

    const rawPort = process.env.SMTP_PORT || process.env.EMAIL_PORT || config.email.port || '587';
    const port = parseInt(rawPort, 10);
    const secure = process.env.SMTP_SECURE === 'true'; // false for 587

    const rawUser = process.env.SMTP_USER || process.env.EMAIL_USER || config.email.user || 'admindailygrace@gmail.com';
    const cleanUser = rawUser.replace(/^["']|["']$/g, '').trim();

    const rawHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || config.email.host || 'smtp.gmail.com';
    const cleanHost = rawHost.replace(/^["']|["']$/g, '').trim();

    if (!this.transporter && cleanHost && cleanUser) {
      this.transporter = nodemailer.createTransport({
        host: cleanHost,
        port,
        secure,
        auth: {
          user: cleanUser,
          pass: cleanPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
      });
    }
    return this.transporter;
  }

  get isSmtpConfigured() {
    return Boolean(config.email.host && config.email.user);
  }

  /**
   * Send the warm Welcome email to newly registered users.
   * @param {Object} userOrParams User object or { to, name } / { email, name }
   */
  async sendWelcomeEmail(userOrParams) {
    const to = userOrParams?.email || userOrParams?.to;
    const name = userOrParams?.name || 'Friend';
    const clientBase = (process.env.APP_URL || process.env.CLIENT_URL || config.clientUrl || 'https://daily-grace-nu.vercel.app').replace(/\/$/, '');
    const todayUrl = `${clientBase}/today`;
    const settingsUrl = `${clientBase}/settings`;
    const subject = 'Welcome to Daily Grace 🌿';

    const textContent = `Welcome to Daily Grace, ${name}!\n\nYour daily moment with God begins today. Every morning at 5:00 AM (WAT), we will deliver your devotional reflection directly to your inbox and app.\n\nWhat to expect every morning:\n• One Scripture: An anchor verse for your day\n• One Reflection: Encouragement for your daily walk\n• One Prayer: A heartfelt conversation with God\n\nBuild a daily spiritual habit with God's Word. Complete each day's reflection to keep your devotional streak alive and nurture your faith one morning at a time.\n\nOpen Today's Devotional:\n${todayUrl}\n\nMay God's peace, grace, and steadfast love guide you today and always.\n\nDAILY GRACE\n\n---\nManage notification preferences: ${settingsUrl}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #F6F7F2; font-family: 'Georgia', serif; color: #252525; -webkit-font-smoothing: antialiased;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F6F7F2; padding: 36px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; border: 1px solid #E6E8E0; box-shadow: 0 4px 16px rgba(0,0,0,0.04); margin: 0 auto;">
                
                <!-- Brand Header -->
                <tr>
                  <td align="center" style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #F0F2EB; background-color: #FAFAF8;">
                    <h1 style="color: #354F42; font-size: 24px; font-weight: normal; margin: 0 0 4px 0; letter-spacing: 2px;">DAILY GRACE</h1>
                    <p style="color: #B8A46A; font-size: 13px; margin: 0; font-style: italic; letter-spacing: 0.5px;">One Scripture. One Reflection. One Prayer.</p>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 36px 32px;">
                    <p style="font-size: 19px; color: #354F42; font-weight: 600; margin: 0 0 16px 0;">
                      Welcome to Daily Grace, ${name}!
                    </p>
                    <p style="font-size: 15px; line-height: 1.7; color: #333333; margin: 0 0 18px 0;">
                      Your daily moment with God begins today. Every morning at <strong>5:00 AM (WAT)</strong>, we will deliver your devotional reflection directly to your inbox and app.
                    </p>

                    <!-- Feature Box -->
                    <div style="background-color: #FBFBFA; border-left: 3px solid #B8A46A; border-radius: 0 6px 6px 0; padding: 18px 20px; margin: 20px 0 24px 0;">
                      <p style="font-size: 13px; font-weight: 600; color: #354F42; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">
                        What to expect every morning:
                      </p>
                      <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #4A4A4A;">
                        <li><strong>One Scripture:</strong> An anchor verse for your day</li>
                        <li><strong>One Reflection:</strong> Encouragement for your daily walk</li>
                        <li><strong>One Prayer:</strong> A heartfelt conversation with God</li>
                      </ul>
                    </div>

                    <!-- Streak & Spiritual Growth Box -->
                    <div style="background-color: #F6F7F2; border-radius: 6px; padding: 16px 20px; margin: 0 0 28px 0;">
                      <p style="font-size: 14px; line-height: 1.6; color: #2C3E35; margin: 0;">
                        🔥 <strong>Daily Streaks & Spiritual Growth:</strong> Build a steady spiritual rhythm with God's Word. Complete each day's reflection in your app or email to keep your devotional streak alive and nurture your faith one morning at a time.
                      </p>
                    </div>

                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 30px 0 22px 0;">
                      <a href="${todayUrl}" target="_blank" style="background-color: #354F42; color: #FFFFFF; text-decoration: none; padding: 15px 38px; border-radius: 4px; font-size: 15px; font-weight: 600; display: inline-block; letter-spacing: 0.5px; box-shadow: 0 2px 8px rgba(53, 79, 66, 0.2);">
                        Open Today's Devotional
                      </a>
                    </div>

                    <p style="font-size: 13px; line-height: 1.6; color: #666666; text-align: center; margin: 24px 0 0 0;">
                      May God's peace, grace, and steadfast love guide you today and always.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td align="center" style="padding: 20px 32px; background-color: #FBFBFA; border-top: 1px solid #F0F2EB;">
                    <p style="font-size: 12px; color: #888888; margin: 0 0 6px 0;">
                      <a href="${settingsUrl}" style="color: #354F42; text-decoration: underline;">Manage Notification Preferences</a>
                    </p>
                    <p style="font-size: 11px; color: #999999; margin: 0;">
                      &copy; ${new Date().getFullYear()} Daily Grace. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const transporter = this.getTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: config.email.from,
          to,
          subject,
          text: textContent,
          html: htmlContent,
        });
        return { success: true, mode: 'smtp' };
      } catch (error) {
        console.error('[EmailService Error] Failed to send welcome email via SMTP:', error.message);
        throw new Error(`SMTP failure: ${error.message}`);
      }
    } else {
      console.log('\n================== [DAILY GRACE WELCOME EMAIL] ==================');
      console.log(`To: ${to} (${name})`);
      console.log(`Subject: ${subject}`);
      console.log(`Today's Devotional URL: \x1b[36m${todayUrl}\x1b[0m`);
      console.log('=================================================================\n');
      return { success: true, mode: 'development', previewUrl: todayUrl };
    }
  }

  /**
   * Send the verification email to newly registered users.
   * Supports both object ({ to, name, token }) and positional (email, name, verificationToken) arguments.
   */
  async sendVerificationEmail(arg1, arg2, arg3) {
    let to, name, token;
    if (typeof arg1 === 'object' && arg1 !== null) {
      to = arg1.to || arg1.email;
      name = arg1.name;
      token = arg1.token || arg1.verificationToken;
    } else {
      to = arg1;
      name = arg2;
      token = arg3;
    }

    const verificationUrl = `${config.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
    const subject = 'Confirm Your Daily Grace Account';

    const textContent = `DAILY GRACE\n\nWelcome to Daily Grace, ${name}.\n\nWe're glad you're here.\n\nPlease confirm your email address to activate your account:\n${verificationUrl}\n\nThis verification link expires in 24 hours.\n\nIf you did not create this account, you can safely ignore this email.\n\nOne Scripture.\nOne Reflection.\nOne Prayer.\n\nDAILY GRACE`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #F6F7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #252525; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F6F7F2; padding: 36px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; border: 1px solid #E6E8E0; box-shadow: 0 4px 16px rgba(0,0,0,0.04); margin: 0 auto;">
                <!-- Header -->
                <tr>
                  <td align="center" style="padding: 36px 32px 24px 32px; border-bottom: 1px solid #F0F2EB;">
                    <h1 style="color: #354F42; font-size: 24px; font-weight: 700; margin: 0 0 6px 0; letter-spacing: 2.5px;">DAILY GRACE</h1>
                    <p style="color: #B8A46A; font-size: 13px; margin: 0; font-style: italic; letter-spacing: 0.5px;">One Scripture. One Reflection. One Prayer.</p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 36px 32px;">
                    <p style="font-size: 18px; color: #354F42; font-weight: 600; margin: 0 0 16px 0;">
                      Welcome to Daily Grace, ${name}.
                    </p>
                    <p style="font-size: 15px; line-height: 1.6; color: #252525; margin: 0 0 12px 0;">
                      We're glad you're here.
                    </p>
                    <p style="font-size: 15px; line-height: 1.6; color: #252525; margin: 0 0 28px 0;">
                      Please confirm your email address to activate your account.
                    </p>
                    <!-- CTA Button -->
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin: 28px auto;">
                      <tr>
                        <td align="center" style="border-radius: 4px; background-color: #354F42;">
                          <a href="${verificationUrl}" target="_blank" style="font-size: 15px; font-weight: 600; color: #FFFFFF; text-decoration: none; padding: 14px 32px; display: inline-block; border-radius: 4px; letter-spacing: 1px;">
                            CONFIRM MY EMAIL
                          </a>
                        </td>
                      </tr>
                    </table>
                    <!-- Expiration & Disclaimer -->
                    <p style="font-size: 13px; line-height: 1.5; color: #666666; margin: 28px 0 8px 0; text-align: center;">
                      This verification link expires in 24 hours.
                    </p>
                    <p style="font-size: 13px; line-height: 1.5; color: #888888; margin: 0 0 28px 0; text-align: center;">
                      If you did not create this account, you can safely ignore this email.
                    </p>
                    <!-- Tagline Footer in Body -->
                    <div style="border-top: 1px solid #F0F2EB; padding-top: 20px; text-align: center;">
                      <p style="font-size: 13px; color: #B8A46A; line-height: 1.6; margin: 0; font-weight: 500;">
                        One Scripture.<br/>
                        One Reflection.<br/>
                        One Prayer.
                      </p>
                      <p style="font-size: 14px; font-weight: 700; color: #354F42; margin: 12px 0 0 0; letter-spacing: 1.5px;">
                        DAILY GRACE
                      </p>
                    </div>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td align="center" style="padding: 16px 32px; background-color: #FBFBFA; border-top: 1px solid #F0F2EB;">
                    <p style="font-size: 11px; color: #999999; margin: 0;">
                      &copy; ${new Date().getFullYear()} Daily Grace. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const transporter = this.getTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: config.email.from,
          to,
          subject,
          text: textContent,
          html: htmlContent,
        });
        return { success: true, mode: 'smtp' };
      } catch (error) {
        console.error('[EmailService Error] Failed to send verification email via SMTP:', error.message);
        throw new Error("We couldn't send the confirmation email right now. Please try again.");
      }
    } else {
      console.log('\n================== [DAILY GRACE EMAIL SERVICE] ==================');
      console.log(`To: ${to} (${name})`);
      console.log(`Subject: ${subject}`);
      console.log(`Verification URL: \x1b[36m${verificationUrl}\x1b[0m`);
      console.log('=================================================================\n');
      return { success: true, mode: 'development', previewUrl: verificationUrl };
    }
  }

  /**
   * Send a 6-digit OTP verification email.
   * Supports both object ({ to, name, otp }) and positional (email, name, otp) arguments.
   */
  async sendVerificationOtpEmail(arg1, arg2, arg3) {
    let toEmail, name, otp;
    if (typeof arg1 === 'object' && arg1 !== null) {
      toEmail = arg1.to || arg1.email;
      name = arg1.name || 'Friend';
      otp = arg1.otp || arg1.code;
    } else if (arg3 !== undefined) {
      toEmail = arg1;
      name = arg2 || 'Friend';
      otp = arg3;
    } else {
      toEmail = arg1;
      name = 'Friend';
      otp = arg2;
    }

    const fromEmail = process.env.RESEND_FROM || config.resendFrom || 'Daily Grace <onboarding@resend.dev>';
    const replyToEmail = process.env.REPLY_TO_EMAIL || config.replyTo || 'admindailygrace@gmail.com';

    if (process.env.NODE_ENV === 'test') {
      return { success: true, mode: 'test', otp };
    }

    // Ensure recipient is dynamically taken from the argument
    const targetEmail = String(toEmail).trim().toLowerCase();
    console.log(`[EmailService] Dispatching OTP via Resend API to: ${targetEmail}`);

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [targetEmail],
      reply_to: replyToEmail,
      subject: 'Your Daily Grace Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 12px;">
          <h2 style="color: #2D3748; text-align: center;">Verify Your Daily Grace Account</h2>
          <p style="color: #4A5568; font-size: 16px;">Use the following 6-digit code to complete your email verification:</p>
          <div style="text-align: center; margin: 32px 0;">
            <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #b48135; background: #faf5eb; padding: 12px 24px; border-radius: 8px; border: 1px dashed #d4af37;">${otp}</span>
          </div>
          <p style="color: #718096; font-size: 14px; text-align: center;">This code will expire in 15 minutes.</p>
        </div>
      `,
    });

    if (error) {
      console.error('[Resend API Error]', error);
      throw new Error(error.message);
    }

    console.log('[Resend API Success]', data);
    return { success: true, mode: 'resend', data };
  }

  /**
   * Resolve backend base URL for email links, ensuring production never defaults to localhost.
   */
  static getBaseUrl() {
    const isProd = process.env.NODE_ENV === 'production';
    let baseUrl = process.env.API_BASE_URL || process.env.RENDER_EXTERNAL_URL || (isProd ? 'https://daily-grace.onrender.com' : (config.serverUrl || 'https://daily-grace.onrender.com'));
    if (isProd && baseUrl.includes('localhost')) {
      baseUrl = 'https://daily-grace.onrender.com';
    }
    return baseUrl;
  }

  /**
   * Send a daily reminder email containing the user's actual Daily Grace motivation.
   * @param {Object} params
   * @param {string} params.to Recipient email address
   * @param {string} params.name Recipient name
   * @param {string} [params.userId] Recipient user UUID for signed 1-click completion
   * @param {string} [params.date] Assigned date (YYYY-MM-DD)
   * @param {Object} [params.motivation] The assigned motivation for today
   */
  async sendDailyReminderEmail({ to, name, userId = null, date = null, motivation = null }) {
    const homeUrl = `${config.clientUrl}/home`;
    const settingsUrl = `${config.clientUrl}/settings`;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const baseUrl = EmailService.getBaseUrl();

    let completeUrl = `${config.clientUrl}/today?completed=true`;
    if (userId) {
      const completionToken = jwt.sign(
        { userId, date: targetDate, action: 'complete_devotion' },
        config.jwtSecret,
        { expiresIn: '7d' }
      );
      completeUrl = `${baseUrl}/api/motivations/email-complete?token=${completionToken}&userId=${userId}`;
    }

    const title = motivation?.title || 'Your Daily Grace';
    const verse = motivation?.verse || 'The Lord is my strength and my shield; my heart trusts in him, and he helps me.';
    const reference = motivation?.reference || 'Psalm 28:7';
    const reflection = motivation?.reflection || 'Take a quiet moment today to pause, breathe, and turn your heart toward God.';
    const prayer = motivation?.prayer || 'Lord, give me strength for today and hope for tomorrow. Amen.';

    const subject = `Your Daily Grace: ${title} 🌿`;

    const textContent = `Good morning, ${name}.\n\nHere is your Daily Grace for today:\n\n${title.toUpperCase()}\n\nBible Verse:\n"${verse}"\n— ${reference}\n\nReflection:\n${reflection}\n\nPrayer:\n${prayer}\n\n✓ Mark as Read / Completed (+1 Streak 🔥):\n${completeUrl}\n\nRead and reflect in the Daily Grace app:\n${homeUrl}\n\nMay God's grace guide you today.\n\nDAILY GRACE\n\n---\nManage notification preferences or unsubscribe: ${settingsUrl}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #F6F7F2; font-family: 'Georgia', serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F6F7F2; padding: 32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; border: 1px solid #E6E8E0; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
                
                <!-- Brand Header -->
                <tr>
                  <td style="padding: 28px 32px; text-align: center; border-bottom: 1px solid #F0F2EB; background-color: #FAFAF8;">
                    <h1 style="color: #354F42; font-size: 22px; font-weight: normal; margin: 0 0 4px 0; letter-spacing: 2px;">DAILY GRACE</h1>
                    <p style="color: #B8A46A; font-size: 12px; margin: 0; font-style: italic; letter-spacing: 0.5px;">One Scripture. One Reflection. One Prayer.</p>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 36px 32px;">
                    <p style="font-size: 16px; color: #666666; margin: 0 0 20px 0;">
                      Good morning, <strong style="color: #354F42;">${name}</strong>. Here is your Daily Grace for today.
                    </p>

                    <!-- Title -->
                    <h2 style="font-size: 22px; color: #354F42; font-weight: 600; margin: 0 0 24px 0; line-height: 1.3;">
                      ${title}
                    </h2>

                    <!-- Scripture Box -->
                    <div style="background-color: #FBFBFA; border-left: 3px solid #B8A46A; border-radius: 0 6px 6px 0; padding: 18px 20px; margin: 0 0 24px 0;">
                      <p style="font-size: 16px; line-height: 1.7; color: #2C3E35; font-style: italic; margin: 0 0 10px 0;">
                        "${verse}"
                      </p>
                      <p style="font-size: 14px; font-weight: 600; color: #B8A46A; margin: 0; text-align: right; letter-spacing: 0.5px;">
                        — ${reference}
                      </p>
                    </div>

                    <!-- Reflection -->
                    <div style="margin: 0 0 24px 0;">
                      <h3 style="font-size: 12px; font-weight: 700; color: #888888; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 8px 0;">
                        Reflection
                      </h3>
                      <p style="font-size: 15px; line-height: 1.7; color: #333333; margin: 0;">
                        ${reflection}
                      </p>
                    </div>

                    <!-- Prayer -->
                    <div style="background-color: #F6F7F2; border-radius: 6px; padding: 18px 20px; margin: 0 0 28px 0;">
                      <h3 style="font-size: 12px; font-weight: 700; color: #354F42; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 8px 0;">
                        Prayer
                      </h3>
                      <p style="font-size: 15px; line-height: 1.7; color: #4A4A4A; font-style: italic; margin: 0;">
                        ${prayer}
                      </p>
                    </div>

                    <!-- Primary 1-Click Completion CTA Button -->
                    <div style="text-align: center; margin: 28px 0 16px 0;">
                      <a href="${completeUrl}" target="_blank" style="background-color: #354F42; color: #FFFFFF; text-decoration: none; padding: 15px 36px; border-radius: 6px; font-size: 15px; font-weight: 700; display: inline-block; letter-spacing: 0.5px; box-shadow: 0 2px 8px rgba(53,79,66,0.25);">
                        Mark Devotion Completed (+1 Streak 🔥)
                      </a>
                    </div>

                    <!-- Secondary link to open app -->
                    <div style="text-align: center; margin: 8px 0 20px 0;">
                      <a href="${homeUrl}" target="_blank" style="color: #6B7C72; text-decoration: underline; font-size: 13px;">
                        Open full experience in Daily Grace
                      </a>
                    </div>

                    <p style="font-size: 13px; line-height: 1.6; color: #888888; text-align: center; margin: 24px 0 0 0;">
                      May God's grace and peace guide your heart today.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 32px; background-color: #FBFBFA; text-align: center; border-top: 1px solid #F0F2EB;">
                    <p style="font-size: 12px; color: #888888; margin: 0 0 6px 0;">
                      You are receiving this email because you enabled Daily Reminders in your Daily Grace account.
                    </p>
                    <p style="font-size: 12px; color: #AAAAAA; margin: 0;">
                      <a href="${settingsUrl}" style="color: #888888; text-decoration: underline;">Manage Preferences</a> · <a href="${settingsUrl}" style="color: #888888; text-decoration: underline;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    if (process.env.NODE_ENV === 'test') {
      return { success: true, mode: 'test', motivation };
    }

    const fromEmail = process.env.RESEND_FROM || config.resendFrom || 'Daily Grace <onboarding@resend.dev>';
    const replyToEmail = process.env.REPLY_TO_EMAIL || config.replyTo || 'admindailygrace@gmail.com';
    const targetEmail = String(to).trim().toLowerCase();
    const apiKey = process.env.RESEND_API_KEY || config.resendApiKey;

    if (apiKey) {
      try {
        const { data, error } = await resend.emails.send({
          from: fromEmail,
          to: [targetEmail],
          reply_to: replyToEmail,
          subject,
          text: textContent,
          html: htmlContent,
        });

        if (error) {
          console.error(`[EmailService Error] Failed to send reminder email to ${targetEmail} via Resend:`, error);
          throw new Error(error.message);
        }

        console.log(`[EmailService] Devotional reminder successfully sent via Resend API to: ${targetEmail}`);
        return { success: true, mode: 'resend', data, motivation };
      } catch (err) {
        console.error(`[EmailService Error] Resend dispatch failed for ${targetEmail}:`, err.message);
        throw err;
      }
    } else {
      console.log('\n================== [DAILY GRACE REMINDER SERVICE] ==================');
      console.log(`To: ${to} (${name})`);
      console.log(`Subject: ${subject}`);
      console.log(`Title: ${title}`);
      console.log(`Verse: "${verse}" (${reference})`);
      console.log(`Devotional URL: \x1b[36m${homeUrl}\x1b[0m`);
      console.log('====================================================================\n');
      return { success: true, mode: 'development', previewUrl: homeUrl, motivation };
    }
  }
}

export { EmailService };
export const emailService = new EmailService();