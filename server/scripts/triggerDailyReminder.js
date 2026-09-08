import { ReminderService, reminderService } from '../src/services/reminderService.js';
import { UserRepository } from '../src/repositories/userRepository.js';
import { PushSubscriptionRepository } from '../src/repositories/pushSubscriptionRepository.js';
import { MotivationService, getLagosDateString } from '../src/services/motivationService.js';
import { emailService } from '../src/services/emailService.js';
import { pushNotificationService } from '../src/services/pushNotificationService.js';
import { checkDbConnection, closePool } from '../src/config/db.js';

async function main() {
  const targetEmail = process.argv[2] || 'oliseneku2chinwemba@gmail.com';
  console.log('================================================================');
  console.log(`[Reminder Trigger] Running Daily Reminder & Push Dispatch for: ${targetEmail}`);
  console.log('================================================================');

  await checkDbConnection();

  const summary = {
    emailsSent: 0,
    pushSent: 0,
    skipped: 0,
    errors: [],
  };

  try {
    const today = getLagosDateString();
    console.log(`Target Lagos Calendar Date: ${today}`);

    // 1. Look up user
    const user = await UserRepository.findByEmail(targetEmail);
    if (!user) {
      console.error(`[Trigger Error] No user found with email '${targetEmail}'.`);
      summary.errors.push(`User '${targetEmail}' not found`);
      console.log('\nFinal Summary:', JSON.stringify(summary, null, 2));
      await closePool();
      process.exit(1);
    }

    console.log(`Found User: ${user.name} (ID: ${user.id})`);

    // 2. Fetch or assign today's motivation
    const motivation = await MotivationService.getTodaysMotivation(user.id, today);
    console.log(`Today's Devotional: "${motivation.title}" (Day ${motivation.day_number || 'N/A'})`);

    // 3. Send Email Reminder
    try {
      console.log(`Sending morning devotional email to: ${user.email}...`);
      await emailService.sendDailyReminderEmail({
        to: user.email,
        name: user.name,
        userId: user.id,
        date: today,
        motivation,
      });
      summary.emailsSent++;
      console.log('✓ Devotional email dispatched successfully.');
    } catch (emailErr) {
      console.error('[Email Error]', emailErr.message);
      summary.errors.push({ type: 'email', error: emailErr.message });
    }

    // 4. Send Web Push Notification
    const subscriptions = await PushSubscriptionRepository.findSubscriptionsByUserId(user.id);
    if (!subscriptions || subscriptions.length === 0) {
      console.log('Notice: No active Web Push device tokens found for this user in push_subscriptions.');
      summary.skipped++;
    } else {
      console.log(`Found ${subscriptions.length} active device push subscription(s). Dispatching push alert...`);
      const pushRes = await pushNotificationService.sendPushToUser(user.id, {
        title: 'Daily Grace 🌿',
        body: `Your daily devotional is ready: ${motivation.title}`,
        url: '/today',
        tag: 'daily-devotion',
      });
      summary.pushSent += pushRes.sent;
      if (pushRes.failed > 0) {
        summary.errors.push({ type: 'push', failed: pushRes.failed });
      }
      console.log(`✓ Web Push alert delivered to ${pushRes.sent} device(s).`);
    }

    console.log('\n================== [REMINDER DISPATCH SUMMARY] ==================');
    console.log(JSON.stringify(summary, null, 2));
    console.log('=================================================================\n');

    await closePool();
    process.exit(0);
  } catch (err) {
    console.error('[Trigger Error] Unexpected failure:', err);
    summary.errors.push(err.message);
    console.log('\nFinal Summary:', JSON.stringify(summary, null, 2));
    await closePool();
    process.exit(1);
  }
}

main();
