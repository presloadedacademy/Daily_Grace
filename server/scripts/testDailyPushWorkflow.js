import { UserRepository } from '../src/repositories/userRepository.js';
import { PushSubscriptionRepository } from '../src/repositories/pushSubscriptionRepository.js';
import { pushNotificationService } from '../src/services/pushNotificationService.js';
import { checkDbConnection, closePool } from '../src/config/db.js';

/**
 * DAILY GRACE — Local Push Notification Workflow Test (Single-User Isolated)
 * 
 * Tests the exact Web Push dispatch flow for ONE specified test user.
 * - Enforces opt-in / opt-out (notification_enabled) verification.
 * - Never contacts any other user.
 * - Never sends emails.
 * - Does not alter daily_reminder_logs or database schema.
 * - Does not leak secrets, endpoints, or keys.
 */
async function main() {
  const targetEmail = process.argv[2];

  if (!targetEmail) {
    console.error('Usage: node scripts/testDailyPushWorkflow.js <user-email>');
    console.error('Example: node scripts/testDailyPushWorkflow.js testuser@example.com');
    process.exit(1);
  }

  console.log('================================================================');
  console.log(`[Daily Push Workflow Test] Target Account: ${targetEmail}`);
  console.log('================================================================');

  try {
    // 1. Check database connection
    await checkDbConnection();

    // 2. Query solely the targeted user by email
    const user = await UserRepository.findByEmail(targetEmail);

    if (!user) {
      console.error(`[Test Result: NOT FOUND] No registered user found with email '${targetEmail}'.`);
      await closePool();
      process.exit(1);
    }

    console.log(`[User Found] Name: ${user.name}`);
    console.log(`[Notification Setting] notification_enabled = ${Boolean(user.notification_enabled)} (${user.notification_enabled ? 'Active' : 'Paused'})`);

    // 3. Evaluate notification_enabled preference
    if (!user.notification_enabled) {
      console.log('\n================================================================');
      console.log('[EXCLUDED] User has notifications paused (notification_enabled = false).');
      console.log('Daily dispatch workflow skips this user.');
      console.log('No Web Push notification sent. No email sent.');
      console.log('================================================================\n');
      await closePool();
      process.exit(0);
    }

    // 4. If active, query device subscriptions for this user only
    console.log('\n[ELIGIBLE] User has notifications active (notification_enabled = true).');
    const subscriptions = await PushSubscriptionRepository.findSubscriptionsByUserId(user.id);

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Subscription Notice] No active push subscriptions found for this user in the database.');
      console.log('To subscribe: Open http://localhost:5173/settings in your browser and ensure notifications are Active.');
      await closePool();
      process.exit(0);
    }

    console.log(`[Push Subscriptions] Found ${subscriptions.length} registered device subscription(s).`);

    // 5. Send exact Daily Grace push payload (push only - no emails)
    const pushPayload = {
      title: '🙏 Your Daily Grace is Ready',
      body: "Start your day with today's Scripture, reflection and prayer.",
      url: '/today',
      tag: 'daily-devotion',
    };

    console.log('[Push Dispatch] Dispatching daily devotion payload to user device(s)...');
    const result = await pushNotificationService.sendPushToUser(user.id, pushPayload);

    console.log('\n================== [DISPATCH SUMMARY] ==================');
    console.log(`Target User        : ${targetEmail}`);
    console.log(`Notification State : Active (true)`);
    console.log(`Devices Targeted   : ${result.total || subscriptions.length}`);
    console.log(`Push Delivered     : ${result.sent}`);
    console.log(`Push Failed        : ${result.failed}`);
    console.log(`Email Dispatched   : None (Push test only)`);
    console.log(`Logs Modified      : None (Preserving production reminder logs)`);
    console.log('========================================================\n');

    if (result.sent > 0) {
      console.log('✓ Web Push notification successfully handed off to browser push service.');
      console.log('  Check your device / browser for the notification alert banner.');
    } else {
      console.log('⚠ Push notification request completed, but 0 devices were accepted by the push service.');
    }

    await closePool();
    process.exit(0);
  } catch (err) {
    console.error('[Workflow Test Error] Unexpected failure:', err.message);
    await closePool();
    process.exit(1);
  }
}

main();
