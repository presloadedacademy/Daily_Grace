import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ReminderService } from '../src/services/reminderService.js';
import { ReminderRepository } from '../src/repositories/reminderRepository.js';
import { UserRepository } from '../src/repositories/userRepository.js';
import { UserService } from '../src/services/userService.js';
import { emailService } from '../src/services/emailService.js';
import { AuthService } from '../src/services/authService.js';
import { MotivationService } from '../src/services/motivationService.js';
import { generateUuid, isValidUuid } from '../src/utils/cryptoUtils.js';

describe('DAILY GRACE — Complete Daily Email Reminder & Duplicate Protection Suite', () => {
  let dispatchedReminders = [];

  beforeEach(() => {
    dispatchedReminders = [];
    ReminderRepository._resetDevStore();

    // Mock emailService.sendDailyReminderEmail to record dispatches and inspect full payload
    emailService.sendDailyReminderEmail = async ({ to, name, motivation }) => {
      dispatchedReminders.push({ to, name, motivation });
      return { success: true, mode: 'mock' };
    };

    // Mock verification email to prevent real SMTP connections in unit tests
    emailService.sendVerificationEmail = async () => ({ success: true });
  });

  /**
   * TEST 1 — User enables reminder. Expected: enabled = true
   */
  it('Test 1: User enables reminder -> enabled = true', async () => {
    const reg = await AuthService.register({
      name: 'Enoch Walk',
      email: 'enoch@dailygrace.app',
      password: 'WalkWithGod2026!',
    });

    const updated = await UserService.updatePreferences(reg.user.id, true);
    assert.equal(updated.notification_enabled, true);

    const profile = await UserService.getProfile(reg.user.id);
    assert.equal(profile.notification_enabled, true);
  });

  /**
   * TEST 2 — User disables reminder. Expected: enabled = false
   */
  it('Test 2: User disables reminder -> enabled = false', async () => {
    const reg = await AuthService.register({
      name: 'Quiet Soul',
      email: 'quiet@dailygrace.app',
      password: 'QuietHeart2026!',
    });

    const updated = await UserService.updatePreferences(reg.user.id, false);
    assert.equal(updated.notification_enabled, false);

    const profile = await UserService.getProfile(reg.user.id);
    assert.equal(profile.notification_enabled, false);
  });

  /**
   * TEST 3 — Reminder setting persists after refresh / re-login
   */
  it('Test 3: Reminder setting persists across profile reloads and re-logins', async () => {
    const reg = await AuthService.register({
      name: 'Persistence Tester',
      email: 'persist@dailygrace.app',
      password: 'PersistPassword1!',
    });

    // Disable notifications
    await UserService.updatePreferences(reg.user.id, false);

    // Simulate re-login
    const loginRes = await AuthService.login({
      email: 'persist@dailygrace.app',
      password: 'PersistPassword1!',
    });

    // Retrieve profile with authenticated user ID
    const profile = await UserService.getProfile(loginRes.user.id);
    assert.equal(profile.notification_enabled, false, 'Setting must persist in the database');
  });

  /**
   * TEST 4 — Disabled user does not receive email
   */
  it('Test 4: Disabled user does not receive reminder email', async () => {
    const mockUsers = [
      { id: generateUuid(), name: 'Silent Reader', email: 'silent@dailygrace.app', email_verified: true, notification_enabled: false },
    ];

    const result = await ReminderService.processDailyReminders('2026-08-29', mockUsers);
    assert.equal(result.eligibleCount, 0);
    assert.equal(result.sentCount, 0);
    assert.equal(dispatchedReminders.length, 0);
  });

  /**
   * TEST 5 — Enabled user receives their daily motivation email
   */
  it('Test 5: Enabled user receives their daily motivation email', async () => {
    const mockUsers = [
      { id: generateUuid(), name: 'John Newton', email: 'newton@dailygrace.app', email_verified: true, notification_enabled: true },
    ];

    const result = await ReminderService.processDailyReminders('2026-08-29', mockUsers);
    assert.equal(result.eligibleCount, 1);
    assert.equal(result.sentCount, 1);
    assert.equal(dispatchedReminders.length, 1);
  });

  /**
   * TEST 6 — The email contains the SAME motivation assigned by the daily motivation system
   */
  it('Test 6: The email contains the EXACT same motivation assigned by the daily motivation system', async () => {
    const userId = generateUuid();
    const date = '2026-08-29';

    // 1. Get motivation assigned to user via the app API
    const appMotivation = await MotivationService.getTodaysMotivation(userId, date);
    assert.ok(appMotivation);
    assert.ok(appMotivation.title);

    // 2. Dispatch daily reminder
    const user = { id: userId, name: 'Grace Recipient', email: 'grace.recipient@dailygrace.app', email_verified: true, notification_enabled: true };
    await ReminderService.processDailyReminders(date, [user]);

    assert.equal(dispatchedReminders.length, 1);
    const sent = dispatchedReminders[0];

    // 3. Verify motivation in email matches app assigned motivation precisely
    assert.ok(sent.motivation);
    assert.equal(sent.motivation.id, appMotivation.id);
    assert.equal(sent.motivation.title, appMotivation.title);
    assert.equal(sent.motivation.verse, appMotivation.verse);
    assert.equal(sent.motivation.reference, appMotivation.reference);
    assert.equal(sent.motivation.reflection, appMotivation.reflection);
    assert.equal(sent.motivation.prayer, appMotivation.prayer);
  });

  /**
   * TEST 7 — The correct user's email address is used
   */
  it('Test 7: The reminder is dispatched to the authenticated user account email address', async () => {
    const mockUsers = [
      { id: generateUuid(), name: 'Amy Carmichael', email: 'amy.carmichael@dailygrace.app', email_verified: true, notification_enabled: true },
    ];

    await ReminderService.processDailyReminders('2026-08-29', mockUsers);
    assert.equal(dispatchedReminders.length, 1);
    assert.equal(dispatchedReminders[0].to, 'amy.carmichael@dailygrace.app');
    assert.equal(dispatchedReminders[0].name, 'Amy Carmichael');
  });

  /**
   * TEST 8 — The same user cannot receive duplicate daily reminder emails
   */
  it('Test 8: The same user cannot receive duplicate daily reminder emails on the same date', async () => {
    const mockUsers = [
      { id: generateUuid(), name: 'Faithful Reader', email: 'faithful@dailygrace.app', email_verified: true, notification_enabled: true },
    ];

    // First run
    const run1 = await ReminderService.processDailyReminders('2026-08-29', mockUsers);
    assert.equal(run1.sentCount, 1);
    assert.equal(dispatchedReminders.length, 1);

    // Second run on same date (simulating retry / restarted cron)
    const run2 = await ReminderService.processDailyReminders('2026-08-29', mockUsers);
    assert.equal(run2.sentCount, 0, 'Must skip user already sent today');
    assert.equal(dispatchedReminders.length, 1, 'Total emails sent must remain exactly 1');
  });

  /**
   * TEST 9 — Email failure is handled safely without crashing or aborting others
   */
  it('Test 9: Email delivery failure for one user is safely logged and does not abort other users', async () => {
    const mockUsers = [
      { id: generateUuid(), name: 'User 1', email: 'user1@dailygrace.app', email_verified: true, notification_enabled: true },
      { id: generateUuid(), name: 'Fail User', email: 'fail@dailygrace.app', email_verified: true, notification_enabled: true },
      { id: generateUuid(), name: 'User 2', email: 'user2@dailygrace.app', email_verified: true, notification_enabled: true },
    ];

    // Throw error only for fail@dailygrace.app
    emailService.sendDailyReminderEmail = async ({ to, name, motivation }) => {
      if (to === 'fail@dailygrace.app') {
        throw new Error('SMTP connection timed out');
      }
      dispatchedReminders.push({ to, name, motivation });
      return { success: true };
    };

    const result = await ReminderService.processDailyReminders('2026-08-29', mockUsers);
    assert.equal(result.sentCount, 2, 'User 1 and User 2 must succeed');
    assert.equal(result.failedCount, 1, 'Fail User must be recorded as failed');
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].email, 'fail@dailygrace.app');
  });

  /**
   * TEST 10 — Unauthorized users cannot modify another user's reminder settings
   */
  it('Test 10: Unauthorized or invalid UUID user IDs cannot modify reminder preferences', async () => {
    const invalidIds = ['usr_admin_1', 'usr_legacy', 'invalid-id', null, undefined];

    for (const badId of invalidIds) {
      await assert.rejects(
        async () => {
          await UserService.updatePreferences(badId, true);
        },
        (err) => {
          assert.equal(err.statusCode, 401);
          return true;
        }
      );
    }
  });

  /**
   * TEST 11 — Timezone calculation accuracy
   */
  it('Test 11: Timezone calculation correctly computes Africa/Lagos date and time', () => {
    // 2026-09-02 07:00:00 UTC is 2026-09-02 08:00:00 Africa/Lagos (UTC+1)
    const testUtcDate = new Date('2026-09-02T07:00:00Z');
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(testUtcDate);
    const getPart = (type) => parts.find((p) => p.type === type)?.value;
    const hour = getPart('hour');
    const minute = getPart('minute');
    const timeString = `${hour}:${minute}`;

    assert.equal(timeString, '08:00', '07:00 UTC must format to 08:00 in Africa/Lagos (Nigeria Time)');
  });
});

