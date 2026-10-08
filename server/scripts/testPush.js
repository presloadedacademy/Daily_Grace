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
    console.log(`[Push Test] Notification Preference: ${user.notification_enabled ? 'Active (true)' : 'Paused (false)'}`);

    // 2. Look up push subscriptions
    const subscriptions = await PushSubscriptionRepository.findSubscriptionsByUserId(user.id);

    if (!subscriptions || subscriptions.length === 0) {
      console.log('\n----------------------------------------------------------------');
      console.log('No push subscriptions found for this user in the database.');
      console.log('To register this device:');
      console.log('1. Log into Daily Grace in your browser.');
      console.log('2. Go to Settings -> Daily Grace Notifications and ensure it is Active.');
      console.log('3. Grant browser notification permissions when prompted.');
      console.log('----------------------------------------------------------------\n');
      await closePool();
      process.exit(0);
    }

    console.log(`[Push Test] Found ${subscriptions.length} active device subscription(s) for user.`);

    // 3. Dispatch test notification with exact production payload
    const pushPayload = {
      title: '🙏 Your Daily Grace is Ready',
      body: "Start your day with today's Scripture, reflection and prayer.",
      url: '/today',
      tag: 'daily-devotion',
    };

    console.log('[Push Test] Sending push notification with payload:', pushPayload);

    const response = await pushNotificationService.sendPushToUser(user.id, pushPayload);

    console.log('\n================== [PUSH DISPATCH RESPONSE] ==================');
    console.log(`Backend Sent Count : ${response.sent}`);
    console.log(`Backend Failed Count: ${response.failed}`);
    console.log(`Total Target Subs  : ${response.total}`);
    console.log('Raw Response:', JSON.stringify(response, null, 2));
    console.log('==============================================================\n');

    if (response.sent > 0) {
      console.log('✓ Backend delivery confirmed! Handed over to browser push service.');
      console.log('  Now check your physical device / browser to confirm the notification alert is displayed.');
    } else {
      console.log('⚠ Push dispatch finished, but 0 devices were accepted by the push service.');
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
