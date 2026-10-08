import { UserRepository } from '../src/repositories/userRepository.js';
import { pushNotificationService } from '../src/services/pushNotificationService.js';
import { checkDbConnection, closePool } from '../src/config/db.js';

/**
 * DAILY GRACE — Real Web Push Dispatch Test (Push Only)
 *
 * Isolated test script to verify:
 * REAL DB USER -> notification_enabled -> REAL SUBSCRIPTION -> pushNotificationService -> REAL PUSH
 *
 * Guarantees:
 * - ZERO emails sent (emailService is NOT imported or called).
 * - ZERO reminder logs recorded (recordReminderLog is NOT called).
 * - Excludes paused users (notification_enabled === false).
 * - Operates strictly on the single specified test user email.
 */
async function main() {
  const targetEmail = process.argv[2];

  if (!targetEmail) {
    console.error('Usage: node scripts/testRealDailyPushOnly.js <user-email>');
    console.error('Example: node scripts/testRealDailyPushOnly.js oliseneku2chinwemba@gmail.com');
    process.exit(1);
  }

  console.log('================================================================');
  console.log('[Daily Grace] Real Web Push Dispatch Test (Push Only)');
  console.log(`Target Email: ${targetEmail}`);
  console.log('================================================================');

  try {
    // 1. Connect to PostgreSQL / Supabase
    await checkDbConnection();

    // 2. Query user from real database
    const user = await UserRepository.findByEmail(targetEmail);

    // 3. User Existence Check
    if (!user) {
      console.log('\n[USER STATUS] User NOT FOUND in database.');
      console.log('Push Dispatch Attempted : NO');
      console.log('Final Result            : STOPPED (Zero notifications sent, zero emails sent)');
      await closePool();
      process.exit(1);
    }

    // 4. Print User Details
    console.log('\n--- User Account Details ---');
    console.log(`User Name            : ${user.name}`);
    console.log(`User Email           : ${user.email}`);
    console.log(`User ID              : ${user.id}`);
    console.log(`Notification Enabled : ${Boolean(user.notification_enabled)} (${user.notification_enabled ? 'Active' : 'PAUSED'})`);
    console.log(`Email Verified       : ${Boolean(user.email_verified)}`);
    console.log('----------------------------\n');

    // 5. Preference Check: Exclude Paused Users
    if (!user.notification_enabled) {
      console.log('================================================================');
      console.log('[USER IS PAUSED] notification_enabled is FALSE.');
      console.log('Push Dispatch Attempted : NO');
      console.log('Emails Sent             : 0');
      console.log('Reminder Logs Modified  : NONE');
      console.log('Final Result            : EXCLUDED (Safely stopped without sending)');
      console.log('================================================================\n');
      await closePool();
      process.exit(0);
    }

    // 6. Active State: Dispatch Real Web Push via pushNotificationService
    console.log('[USER IS ACTIVE] notification_enabled is TRUE. Proceeding with Web Push dispatch...');

    const pushPayload = {
      title: '🙏 Your Daily Grace is Ready',
      body: "Start your day with today's Scripture, reflection and prayer.",
      url: '/today',
      tag: 'daily-devotion',
    };

    console.log('Payload:', JSON.stringify(pushPayload, null, 2));
    console.log('\nCalling pushNotificationService.sendPushToUser()...');

    const result = await pushNotificationService.sendPushToUser(user.id, pushPayload);

    console.log('\n================== [DISPATCH REPORT] ==================');
    console.log(`Push Dispatch Attempted : YES`);
    console.log(`Devices / Subs Targeted : ${result.total || 0}`);
    console.log(`Successful Dispatches   : ${result.sent || 0}`);
    console.log(`Failed Dispatches       : ${result.failed || 0}`);
    console.log(`Emails Dispatched       : 0 (emailService was NOT called)`);
    console.log(`Reminder Logs Recorded  : 0 (recordReminderLog was NOT called)`);

    if (result.sent > 0) {
      console.log('Final Result            : PUSH SUCCESS');
      console.log('=======================================================\n');
      console.log('✓ Web Push notification delivered to browser push service.');
      console.log('  Check your browser/device for the notification banner.');
    } else if (result.total === 0) {
      console.log('Final Result            : NO REGISTERED PUSH SUBSCRIPTIONS');
      console.log('=======================================================\n');
      console.log('Notice: User has no active push subscription in push_subscriptions table.');
      console.log('To subscribe: Log into http://localhost:5173/settings and ensure notifications are Active.');
    } else {
      console.log('Final Result            : PUSH FAILED');
      console.log('=======================================================\n');
      console.log('Push dispatch was rejected by the push gateway.');
    }

    await closePool();
    process.exit(0);
  } catch (err) {
    console.error('\n[Unexpected Error]', err.message);
    console.log('Final Result: PUSH FAILED');
    await closePool();
    process.exit(1);
  }
}

main();
