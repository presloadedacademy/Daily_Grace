import { pushNotificationService } from '../src/services/pushNotificationService.js';
import { UserRepository } from '../src/repositories/userRepository.js';
import { PushSubscriptionRepository } from '../src/repositories/pushSubscriptionRepository.js';
import { checkDbConnection, closePool } from '../src/config/db.js';

async function main() {
  const targetEmail = process.argv[2] || 'olisenekuchinwemba@gmail.com';
  console.log('================================================================');
  console.log(`[Push Test] Testing Web Push Notification for: ${targetEmail}`);
  console.log('================================================================');

  try {
    // 0. Ensure PostgreSQL database connection
    await checkDbConnection();

    // 1. Look up user by email
    const user = await UserRepository.findByEmail(targetEmail);
    if (!user) {
      console.error(`[Push Test Error] No user found with email '${targetEmail}'. Please check the spelling or ensure the user is registered.`);
      await closePool();
      process.exit(1);
    }

    console.log(`[Push Test] Found User: ${user.name} (ID: ${user.id})`);

    // 2. Look up push subscriptions
    const subscriptions = await PushSubscriptionRepository.findSubscriptionsByUserId(user.id);

    if (!subscriptions || subscriptions.length === 0) {
      console.log('\n----------------------------------------------------------------');
      console.log('No push subscriptions found for this user in the database. Make sure you logged in on mobile and tapped Allow on the notification prompt.');
      console.log('----------------------------------------------------------------\n');
      await closePool();
      process.exit(0);
    }

    console.log(`[Push Test] Found ${subscriptions.length} active device subscription(s) for user.`);

    // 3. Dispatch test pop-up alert
    const pushPayload = {
      title: 'Daily Grace 🌿',
      body: 'Test pop-up alert! Your daily devotional is ready.',
      url: '/today',
      tag: 'daily-devotion',
    };

    console.log('[Push Test] Sending push notification with payload:', pushPayload);

    const response = await pushNotificationService.sendPushToUser(user.id, pushPayload);

    console.log('\n================== [PUSH DISPATCH RESPONSE] ==================');
    console.log(`Sent: ${response.sent}`);
    console.log(`Failed: ${response.failed}`);
    console.log(`Total: ${response.total}`);
    console.log('Exact Result Object:', JSON.stringify(response, null, 2));
    console.log('==============================================================\n');

    if (response.sent > 0) {
      console.log('✓ Push notification successfully delivered to device(s)!');
    } else {
      console.log('⚠ Push notification dispatch completed, but 0 devices received it.');
    }

    await closePool();
    process.exit(0);
  } catch (err) {
    console.error('[Push Test Error] Unexpected failure:', err);
    await closePool();
    process.exit(1);
  }
}

main();
