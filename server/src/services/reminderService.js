import { ReminderRepository } from '../repositories/reminderRepository.js';
import { MotivationService } from './motivationService.js';
import { emailService } from './emailService.js';

export class ReminderService {
  /**
   * Process and dispatch daily email reminders for all eligible users on a given date.
   * Fetches each user's exact assigned daily motivation from the database.
   * @param {string} [customDate] Optional YYYY-MM-DD date string
   * @param {Array<Object>} [mockUsersList] Optional mock users list for testing
   * @returns {Promise<{ reminderDate: string, eligibleCount: number, sentCount: number, failedCount: number, errors: Array<Object> }>}
   */
  static async processDailyReminders(customDate = null, mockUsersList = null) {
    const reminderDate = customDate || new Date().toISOString().split('T')[0];

    // Determine eligible users (must be enabled and not already received reminder today)
    let eligibleUsers = [];
    if (mockUsersList) {
      eligibleUsers = mockUsersList.filter(
        (u) => (u.email_verified !== false) && (u.notification_enabled !== false)
      );
    } else {
      eligibleUsers = await ReminderRepository.findEligibleUsersForReminder(reminderDate);
    }

    let sentCount = 0;
    let failedCount = 0;
    const errors = [];

    console.log(`[ReminderService] Processing daily reminders for ${reminderDate}. Eligible recipients: ${eligibleUsers.length}`);

    for (const user of eligibleUsers) {
      // Double check duplicate log to ensure complete idempotency
      const alreadySent = await ReminderRepository.hasReceivedReminder(user.id, reminderDate);
      if (alreadySent) {
        continue;
      }

      try {
        // Fetch or assign the EXACT daily motivation for this user on this date
        let motivation = null;
        try {
          motivation = await MotivationService.getTodaysMotivation(user.id, reminderDate);
        } catch (motErr) {
          console.warn(`[ReminderService] Could not retrieve motivation for user ${user.id}:`, motErr.message);
        }

        // Send the daily reminder email containing their real daily motivation
        await emailService.sendDailyReminderEmail({
          to: user.email,
          name: user.name,
          motivation,
        });

        await ReminderRepository.recordReminderLog(user.id, reminderDate, 'sent');
        sentCount++;
      } catch (err) {
        failedCount++;
        const errMsg = `Failed to send daily reminder to user ${user.id} (${user.email}): ${err.message}`;
        console.error(`[ReminderService Error] ${errMsg}`);
        errors.push({
          userId: user.id,
          email: user.email,
          error: err.message,
        });
      }
    }

    console.log(`[ReminderService] Reminders completed for ${reminderDate}. Sent: ${sentCount}, Failed: ${failedCount}`);

    return {
      reminderDate,
      eligibleCount: eligibleUsers.length,
      sentCount,
      failedCount,
      errors,
    };
  }
}

