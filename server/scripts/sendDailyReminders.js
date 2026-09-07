import { ReminderService } from '../src/services/reminderService.js';
import { closePool, checkDbConnection } from '../src/config/db.js';

async function runManualReminderDispatch() {
  console.log('\n================== DAILY GRACE REMINDER TRIGGER ==================');
  console.log('Mode: Safe Manual Dispatch / Testing');

  await checkDbConnection();

  try {
    const customDate = process.argv[2] || null;
    const result = await ReminderService.processDailyReminders(customDate);

    console.log('\n--- Dispatch Summary ---');
    console.log(`Target Date: ${result.reminderDate}`);
    console.log(`Eligible Recipients: ${result.eligibleCount}`);
    console.log(`Sent Successfully: ${result.sentCount}`);
    console.log(`Failed: ${result.failedCount}`);
    if (result.errors.length > 0) {
      console.log('Failures:');
      result.errors.forEach((e) => console.log(`  ✗ ${e.email}: ${e.error}`));
    }
    console.log('==================================================================\n');
  } catch (err) {
    console.error('[Manual Trigger Error]', err.message);
  } finally {
    await closePool();
  }
}

runManualReminderDispatch()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
