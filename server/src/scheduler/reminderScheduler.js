import { config } from '../config/env.js';
import { ReminderService } from '../services/reminderService.js';

export const DEFAULT_REMINDER_CRON = '0 5 * * *';
export const DEFAULT_REMINDER_TIME = '05:00';
export const DEFAULT_REMINDER_TIMEZONE = 'Africa/Lagos';

let schedulerInterval = null;
let lastTriggeredDate = null;

/**
 * Triggers the daily reminder dispatcher job.
 * @param {string} [customDate] Optional YYYY-MM-DD date string
 */
export async function dispatchDailyReminders(customDate = null) {
  return ReminderService.processDailyReminders(customDate);
}

/**
 * Initializes the background daily reminder scheduler.
 */
export function startReminderScheduler() {
  const reminderTime = config.dailyReminderTime || DEFAULT_REMINDER_TIME;
  const timezone = config.reminderTimezone || DEFAULT_REMINDER_TIMEZONE;

  if (!config.enableReminderScheduler) {
    console.log('[ReminderScheduler] Daily reminder scheduler is disabled in configuration.');
    return;
  }

  console.log(`[ReminderScheduler] Daily reminder scheduler active. Scheduled time: ${reminderTime} (${timezone}). Cron: ${config.reminderCronSchedule || DEFAULT_REMINDER_CRON}`);

  // Check every 60 seconds
  schedulerInterval = setInterval(async () => {
    try {
      const now = new Date();
      // Format current time and calendar date in the target timezone (e.g., Africa/Lagos)
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: config.reminderTimezone || 'Africa/Lagos',
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

      const currentTimeString = `${hour}:${minute}`;
      const currentDateString = `${year}-${month}-${day}`;

      if (currentTimeString === config.dailyReminderTime && lastTriggeredDate !== currentDateString) {
        lastTriggeredDate = currentDateString;
        console.log(`[ReminderScheduler] Triggering scheduled daily reminder job at ${currentTimeString} (${config.reminderTimezone}) for ${currentDateString}...`);
        await ReminderService.processDailyReminders(currentDateString);
      }
    } catch (err) {
      console.error('[ReminderScheduler Error] Scheduled job error:', err.message);
    }
  }, 60000);
}


/**
 * Stops the background scheduler (useful for graceful shutdown / tests).
 */
export function stopReminderScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}
