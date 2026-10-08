import { PushSubscriptionRepository } from '../src/repositories/pushSubscriptionRepository.js';
import { pushNotificationService } from '../src/services/pushNotificationService.js';
import { getLagosDateString } from '../src/services/motivationService.js';
import { checkDbConnection, closePool } from '../src/config/db.js';

/**
 * DAILY GRACE — Dedicated Production Daily Push Notification Dispatcher
 *
 * Primary execution path for cPanel Cron / CLI at 05:00 Africa/Lagos.
 *
 * Characteristics:
 * - PUSH ONLY: Does NOT send emails (emailService is completely excluded).
 * - Excludes users where notification_enabled = false.
 * - Targets all eligible users who have active Web Push device subscriptions.
 * - Dispatches the standard Daily Grace morning devotional push payload.
 * - Does NOT mutate daily_reminder_logs (preserving logs for future email workflow).
 * - Safe, idempotent, and exits cleanly.
 */
export async function processDailyPushNotifications(customDate = null, mockUsersList = null) {
  const lagosDate = getLagosDateString(customDate);

  console.log('================================================================');
  console.log('DAILY GRACE — Dedicated Web Push Notification Dispatcher');
  console.log(`Target Date (Africa/Lagos) : ${lagosDate}`);
  console.log('Mode                       : PUSH ONLY (No emails sent)');
  console.log('================================================================');

  if (!mockUsersList) {
    await checkDbConnection();
  }

  try {
    // 1. Retrieve all users with active push subscriptions & notification_enabled = true
    const eligibleUsers = mockUsersList || (await PushSubscriptionRepository.findEligiblePushUsers());

    console.log(`[Push Dispatcher] Found ${eligibleUsers.length} eligible user(s) with active push subscriptions.`);

    let totalSent = 0;
    let totalFailed = 0;
    let totalDevices = 0;
    const errors = [];

    const pushPayload = {
      title: '🙏 Your Daily Grace is Ready',
      body: "Start your day with today's Scripture, reflection and prayer.",
      url: '/today',
      tag: 'daily-devotion',
    };

    for (const user of eligibleUsers) {
      try {
        console.log(`[Push Dispatcher] Dispatching morning push to: ${user.email} (ID: ${user.id})`);
        const result = await pushNotificationService.sendPushToUser(user.id, pushPayload);

        totalDevices += (result.total || 0);
        totalSent += (result.sent || 0);
        totalFailed += (result.failed || 0);

        if (result.failed > 0) {
          errors.push({ email: user.email, failed: result.failed });
        }
      } catch (userErr) {
        console.error(`[Push Dispatcher Error] Failed dispatch for ${user.email}:`, userErr.message);
        errors.push({ email: user.email, error: userErr.message });
      }
    }

    const summary = {
      date: lagosDate,
      eligibleUsers: eligibleUsers.length,
      devicesTargeted: totalDevices,
      pushSent: totalSent,
      pushFailed: totalFailed,
      emailsSent: 0,
      reminderLogsModified: 0,
      errors,
    };

    console.log('\n================== [DAILY PUSH DISPATCH SUMMARY] ==================');
    console.log(JSON.stringify(summary, null, 2));
    console.log('===================================================================\n');

    return summary;
  } finally {
    if (!mockUsersList) {
      await closePool();
    }
  }
}

// Allow direct CLI / Cron execution: `node scripts/sendDailyPushNotifications.js`
const isDirectExecution = process.argv[1] && process.argv[1].endsWith('sendDailyPushNotifications.js');
if (isDirectExecution) {
  processDailyPushNotifications()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Fatal Push Dispatcher Error]:', err);
      process.exit(1);
    });
}
