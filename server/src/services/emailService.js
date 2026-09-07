import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

class EmailService {
  constructor() {
    this.transporter = null;
  }

  getTransporter() {
    if (!this.transporter && config.email.host && config.email.user) {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.user,
          pass: config.email.password,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    }
    return this.transporter;
  }

  get isSmtpConfigured() {
    return Boolean(config.email.host && config.email.user);
  }

  /**
   * Send the warm Welcome email to newly registered users.
   * @param {Object} params
   * @param {string} params.to Recipient email address
   * @param {string} params.name Recipient name
   */
  async sendWelcomeEmail({ to, name }) {
    const homeUrl = `${config.clientUrl}/home`;
    const settingsUrl = `${config.clientUrl}/settings`;
    const subject = 'Welcome to Daily Grace 🌿';

    const textContent = `Hello ${name},\n\nWelcome to Daily Grace.\n\nWe are delighted to walk alongside you in your spiritual journey. Daily Grace is your quiet sanctuary to start each day rooted in God's Word: One Scripture. One Reflection. One Prayer.\n\nYour morning devotional emails are automatically active. Your daily motivation will arrive in your inbox every morning at 08:00 AM (Africa/Lagos time).\n\nStart Your Daily Grace Journey: ${homeUrl}\n\nMay God's grace and steadfast love guide you today and always.\n\nDAILY GRACE\n\n---\nManage notification preferences: ${settingsUrl}`;

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
                    <p style="font-size: 18px; color: #354F42; font-weight: 600; margin: 0 0 16px 0;">
                      Welcome to Daily Grace, ${name}.
                    </p>
                    <p style="font-size: 15px; line-height: 1.7; color: #333333; margin: 0 0 16px 0;">
                      We are delighted to welcome you. Daily Grace was created to be a quiet sanctuary for your soul—a peaceful place to pause, reflect, and center your heart upon God's truth.
                    </p>

                    <!-- Feature Box -->
                    <div style="background-color: #FBFBFA; border-left: 3px solid #B8A46A; border-radius: 0 6px 6px 0; padding: 18px 20px; margin: 20px 0 24px 0;">
                      <p style="font-size: 14px; font-weight: 600; color: #354F42; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 1px;">
                        What to expect every morning:
                      </p>
                      <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #4A4A4A;">
                        <li><strong>One Scripture:</strong> An anchor verse for your day</li>
                        <li><strong>One Reflection:</strong> Encouragement for your daily walk</li>
                        <li><strong>One Prayer:</strong> A heartfelt conversation with God</li>
                      </ul>
                    </div>

                    <!-- Automatic Reminders Notice -->
                    <div style="background-color: #F6F7F2; border-radius: 6px; padding: 16px 20px; margin: 0 0 28px 0;">
                      <p style="font-size: 14px; line-height: 1.6; color: #2C3E35; margin: 0;">
                        🌿 <strong>Your Morning Reminders are Active:</strong> Your daily devotion will arrive in your inbox every morning at <strong>08:00 AM (Africa/Lagos time)</strong>. You can adjust this anytime in your Settings.
                      </p>
                    </div>

                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 28px 0 20px 0;">
                      <a href="${homeUrl}" target="_blank" style="background-color: #354F42; color: #FFFFFF; text-decoration: none; padding: 14px 36px; border-radius: 4px; font-size: 15px; font-weight: 600; display: inline-block; letter-spacing: 0.5px;">
                        Start Your Daily Grace Journey
                      </a>
                    </div>

                    <p style="font-size: 13px; line-height: 1.6; color: #666666; text-align: center; margin: 24px 0 0 0;">
                      May God's peace and steadfast love fill your heart today.
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
      console.log(`App URL: \x1b[36m${homeUrl}\x1b[0m`);
      console.log('=================================================================\n');
      return { success: true, mode: 'development', previewUrl: homeUrl };
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
   * Send a daily reminder email containing the user's actual Daily Grace motivation.
   * @param {Object} params
   * @param {string} params.to Recipient email address
   * @param {string} params.name Recipient name
   * @param {Object} [params.motivation] The assigned motivation for today
   */
  async sendDailyReminderEmail({ to, name, motivation = null }) {
    const homeUrl = `${config.clientUrl}/home`;
    const settingsUrl = `${config.clientUrl}/settings`;

    const title = motivation?.title || 'Your Daily Grace';
    const verse = motivation?.verse || 'The Lord is my strength and my shield; my heart trusts in him, and he helps me.';
    const reference = motivation?.reference || 'Psalm 28:7';
    const reflection = motivation?.reflection || 'Take a quiet moment today to pause, breathe, and turn your heart toward God.';
    const prayer = motivation?.prayer || 'Lord, give me strength for today and hope for tomorrow. Amen.';

    const subject = `Your Daily Grace: ${title} 🌿`;

    const textContent = `Good morning, ${name}.\n\nHere is your Daily Grace for today:\n\n${title.toUpperCase()}\n\nBible Verse:\n"${verse}"\n— ${reference}\n\nReflection:\n${reflection}\n\nPrayer:\n${prayer}\n\nRead and reflect in the Daily Grace app: ${homeUrl}\n\nMay God's grace guide you today.\n\nDAILY GRACE\n\n---\nManage notification preferences or unsubscribe: ${settingsUrl}`;

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
                    <div style="background-color: #F6F7F2; border-radius: 6px; padding: 18px 20px; margin: 0 0 32px 0;">
                      <h3 style="font-size: 12px; font-weight: 700; color: #354F42; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 8px 0;">
                        Prayer
                      </h3>
                      <p style="font-size: 15px; line-height: 1.7; color: #4A4A4A; font-style: italic; margin: 0;">
                        ${prayer}
                      </p>
                    </div>

                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 28px 0 16px 0;">
                      <a href="${homeUrl}" target="_blank" style="background-color: #354F42; color: #FFFFFF; text-decoration: none; padding: 14px 36px; border-radius: 4px; font-size: 15px; font-weight: 600; display: inline-block; letter-spacing: 0.5px;">
                        Open in Daily Grace
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
                    <p style="font-size: 12px; color: #888888; margin: 0 0 10px 0;">
                      <a href="${settingsUrl}" style="color: #354F42; text-decoration: underline;">Manage Notification Preferences</a>
                    </p>
                    <p style="font-size: 11px; color: #AAAAAA; margin: 0;">
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
        console.error(`[EmailService Error] Failed to send reminder email to ${to}:`, error.message);
        throw new Error(`SMTP failure: ${error.message}`);
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

export const emailService = new EmailService();