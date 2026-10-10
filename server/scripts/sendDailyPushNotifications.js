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
/**
 * Checks whether a user is currently due for their daily push notification based on their local time.
 */
export function isUserDueForPush(user, now = new Date(), options = {}) {
  const { isForced = false, customDate = null, catchUpWindowMinutes = 120 } = options;
  if (isForced) {
    return { isDue: true, userLocalDate: getLagosDateString(customDate) };
  }

  const userTz = user.timezone || 'Africa/Lagos';
  let userLocalDate;
  let userCurrentMinutes;

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const getPart = (type) => parts.find((p) => p.type === type)?.value;
    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    let hour = getPart('hour');
    if (hour === '24') hour = '00';
    const minute = getPart('minute');

    userLocalDate = customDate || `${year}-${month}-${day}`;
    userCurrentMinutes = parseInt(hour, 10) * 60 + parseInt(minute, 10);
  } catch {
    userLocalDate = getLagosDateString(customDate);
    userCurrentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  }

  const reminderTime = user.reminder_time || '05:00';
  const [remHour, remMin] = reminderTime.split(':').map((s) => parseInt(s, 10));
  const userReminderMinutes = remHour * 60 + remMin;

  const diffMinutes = userCurrentMinutes - userReminderMinutes;
  const isDue = (diffMinutes >= 0 && diffMinutes <= catchUpWindowMinutes);

  return { isDue, userLocalDate, diffMinutes, userCurrentMinutes, userReminderMinutes };
}

export async function processDailyPushNotifications(customDate = null, mockUsersList = null, options = {}) {
  const { shouldClosePool = false } = options;
  const isForced = Boolean(options.force || options.isForced);
  const refNow = options.now || new Date();
  const catchUpWindow = options.catchUpWindowMinutes !== undefined ? options.catchUpWindowMinutes : 120;
  const lagosDate = getLagosDateString(customDate);

  console.log('================================================================');
  console.log('DAILY GRACE — Dedicated Web Push Notification Dispatcher');
  console.log(`Target Date (Africa/Lagos) : ${lagosDate}`);
  console.log(`Mode                       : PUSH ONLY (Idempotent per-user)`);
  console.log(`Force Dispatch             : ${isForced}`);
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
    let dueUsersCount = 0;
    let alreadyClaimedCount = 0;
    const errors = [];

    const pushPayload = {
      title: '🙏 Your Daily Grace is Ready',
      body: "Start your day with today's Scripture, reflection and prayer.",
      url: '/today',
      tag: 'daily-devotion',
    };

    for (const user of eligibleUsers) {
      if (user.notification_enabled === false) {
        continue;
      }

      const dueCheck = isUserDueForPush(user, refNow, {
        isForced,
        customDate,
        catchUpWindowMinutes: catchUpWindow,
      });

      // If customDate is passed explicitly without now/ref, treat as targeted for that date
      const shouldDispatch = isForced || options.skipDueTimeCheck || customDate ? true : dueCheck.isDue;

      if (!shouldDispatch) {
        continue;
      }

      dueUsersCount++;
      const targetLocalDate = dueCheck.userLocalDate;

      // 2. Database-backed idempotency claim
      let claimed = null;
      if (!isForced) {
        claimed = await PushSubscriptionRepository.claimDailyPush(user.id, targetLocalDate, 'claiming');
        if (!claimed) {
          alreadyClaimedCount++;
          console.log(`[Push Dispatcher] User ${user.email} already received/claimed push for ${targetLocalDate}. Skipping duplicate.`);
          continue;
        }
      }

      try {
        console.log(`[Push Dispatcher] Dispatching push to: ${user.email} (ID: ${user.id}) for date: ${targetLocalDate}`);
        const result = await pushNotificationService.sendPushToUser(user.id, pushPayload);

        totalDevices += (result.total || 0);
        totalSent += (result.sent || 0);
        totalFailed += (result.failed || 0);

        if (!isForced) {
          const finalStatus = result.sent > 0 ? 'sent' : (result.failed > 0 ? 'failed' : 'no_devices');
          await PushSubscriptionRepository.updateDailyPushLog(user.id, targetLocalDate, {
            status: finalStatus,
            devicesTargeted: result.total || 0,
            devicesSent: result.sent || 0,
            devicesFailed: result.failed || 0,
          });
        }

        if (result.failed > 0) {
          errors.push({ email: user.email, failed: result.failed });
        }
      } catch (userErr) {
        console.error(`[Push Dispatcher Error] Failed dispatch for ${user.email}:`, userErr.message);
        if (!isForced) {
          await PushSubscriptionRepository.updateDailyPushLog(user.id, targetLocalDate, {
            status: 'error',
            devicesTargeted: 0,
            devicesSent: 0,
            devicesFailed: 1,
          });
        }
        errors.push({ email: user.email, error: userErr.message });
      }
    }

    const summary = {
      date: lagosDate,
      eligibleUsers: eligibleUsers.length,
      dueUsers: dueUsersCount,
      alreadyClaimedSkipped: alreadyClaimedCount,
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
    if (!mockUsersList && shouldClosePool) {
      await closePool();
    }
  }
}

// Allow direct CLI / Cron execution: `node scripts/sendDailyPushNotifications.js`
const isDirectExecution = process.argv[1] && process.argv[1].endsWith('sendDailyPushNotifications.js');
if (isDirectExecution) {
  processDailyPushNotifications(null, null, { shouldClosePool: true })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Fatal Push Dispatcher Error]:', err);
      process.exit(1);
    });
}
