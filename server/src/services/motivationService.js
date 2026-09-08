import { MotivationRepository } from '../repositories/motivationRepository.js';
import { DailyAssignmentRepository } from '../repositories/dailyAssignmentRepository.js';
import { UserRepository } from '../repositories/userRepository.js';
import { AppError } from './authService.js';
import { isValidUuid } from '../utils/cryptoUtils.js';
import { config } from '../config/env.js';

/**
 * Helper to compute the calendar date string (YYYY-MM-DD) in Africa/Lagos (WAT) timezone.
 */
export function getLagosDateString(customDate = null) {
  if (customDate) return customDate;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.reminderTimezone || 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

export class MotivationService {
  /**
   * Calculate updated streak based on last completed date and target date.
   * @param {Object} user User object
   * @param {string} targetDateStr YYYY-MM-DD string
   */
  static calculateStreak(user, targetDateStr) {
    const currentStreak = user.current_streak || 0;
    const longestStreak = user.longest_streak || 0;

    if (!user.last_completed_date) {
      const newStreak = 1;
      return {
        currentStreak: newStreak,
        longestStreak: Math.max(longestStreak, newStreak),
        lastCompletedDate: targetDateStr,
        isAlreadyCompletedToday: false,
      };
    }

    const lastDateStr = typeof user.last_completed_date === 'string'
      ? user.last_completed_date.split('T')[0]
      : user.last_completed_date.toISOString().split('T')[0];

    if (lastDateStr === targetDateStr) {
      return {
        currentStreak: Math.max(1, currentStreak),
        longestStreak: Math.max(longestStreak, Math.max(1, currentStreak)),
        lastCompletedDate: lastDateStr,
        isAlreadyCompletedToday: true,
      };
    }

    const [ly, lm, ld] = lastDateStr.split('-').map(Number);
    const [ty, tm, td] = targetDateStr.split('-').map(Number);
    const lastUtc = Date.UTC(ly, lm - 1, ld);
    const targetUtc = Date.UTC(ty, tm - 1, td);
    const diffDays = Math.round((targetUtc - lastUtc) / (1000 * 60 * 60 * 24));

    let newStreak = 1;
    if (diffDays === 1) {
      // Consecutive calendar day
      newStreak = currentStreak + 1;
    } else if (diffDays <= 0) {
      newStreak = currentStreak || 1;
    } else {
      // Missed 1+ days -> reset to 1
      newStreak = 1;
    }

    const newLongest = Math.max(longestStreak, newStreak);

    return {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastCompletedDate: targetDateStr,
      isAlreadyCompletedToday: false,
    };
  }

  /**
   * Retrieve or atomically assign today's motivation for an authenticated user.
   * @param {string} userId UUID of authenticated user
   * @param {string} [customDate] Optional YYYY-MM-DD date string
   */
  static async getTodaysMotivation(userId, customDate = null) {
    if (!userId || !isValidUuid(userId)) {
      throw new AppError('User authentication required.', 401, 'UNAUTHORIZED');
    }

    const user = await UserRepository.findById(userId);
    const currentStreak = user?.current_streak || 0;
    const longestStreak = user?.longest_streak || 0;

    // Determine today's date in Africa/Lagos timezone (YYYY-MM-DD format)
    const today = getLagosDateString(customDate);

    // Step 1: Check if user already received a motivation today
    const existing = await DailyAssignmentRepository.findAssignmentByUserAndDate(userId, today);
    if (existing) {
      return {
        id: existing.id,
        title: existing.title,
        verse: existing.verse,
        reference: existing.reference,
        reflection: existing.reflection,
        prayer: existing.prayer,
        day_number: existing.day_number || null,
        assigned_date: existing.assigned_date,
        cycle_number: existing.cycle_number,
        is_completed: Boolean(existing.is_completed),
        completed: Boolean(existing.is_completed),
        completed_at: existing.completed_at || null,
        current_streak: currentStreak,
        longest_streak: longestStreak,
      };
    }

    // Step 2: Determine user's current cycle number
    let currentCycle = await DailyAssignmentRepository.getUserCurrentCycle(userId);

    // Step 3: Find an unused motivation in the current cycle
    let motivation = await DailyAssignmentRepository.findUnusedMotivationInCycle(userId, currentCycle);

    // Step 4: If no unused motivation in this cycle, check if catalog is empty or if cycle is complete
    if (!motivation) {
      const totalPublished = await MotivationRepository.countTotalPublishedMotivations();
      if (totalPublished === 0) {
        throw new AppError(
          'Your next Grace is being prepared. Please check back soon.',
          404,
          'NO_MOTIVATIONS_AVAILABLE'
        );
      }

      // Cycle completion: Start the next cycle
      currentCycle += 1;
      motivation = await DailyAssignmentRepository.findUnusedMotivationInCycle(userId, currentCycle);

      if (!motivation) {
        throw new AppError(
          'Your next Grace is being prepared. Please check back soon.',
          404,
          'NO_MOTIVATIONS_AVAILABLE'
        );
      }
    }

    // Step 5: Atomically create assignment with conflict protection
    await DailyAssignmentRepository.createDailyAssignment({
      userId,
      motivationId: motivation.id,
      assignedDate: today,
      cycleNumber: currentCycle,
    });

    // Step 6: Fetch confirmed assignment (resolves concurrency / race conditions)
    const confirmed = await DailyAssignmentRepository.findAssignmentByUserAndDate(userId, today);

    return {
      id: confirmed.id,
      title: confirmed.title,
      verse: confirmed.verse,
      reference: confirmed.reference,
      reflection: confirmed.reflection,
      prayer: confirmed.prayer,
      day_number: confirmed.day_number || null,
      assigned_date: confirmed.assigned_date,
      cycle_number: confirmed.cycle_number,
      is_completed: Boolean(confirmed.is_completed),
      completed: Boolean(confirmed.is_completed),
      completed_at: confirmed.completed_at || null,
      current_streak: currentStreak,
      longest_streak: longestStreak,
    };
  }

  /**
   * Mark devotion completed for a user on a given date and recalculate streak.
   * @param {string} userId UUID of user
   * @param {string} [customDate] Optional YYYY-MM-DD date string
   */
  static async markDevotionCompleted(userId, customDate = null) {
    if (!userId || !isValidUuid(userId)) {
      throw new AppError('User authentication required.', 401, 'UNAUTHORIZED');
    }

    const user = (await UserRepository.findById(userId)) || {
      current_streak: 0,
      longest_streak: 0,
      last_completed_date: null,
    };

    const today = getLagosDateString(customDate);

    // Ensure assignment exists for this date
    let assignment = await DailyAssignmentRepository.findAssignmentByUserAndDate(userId, today);
    if (!assignment) {
      await this.getTodaysMotivation(userId, today);
      assignment = await DailyAssignmentRepository.findAssignmentByUserAndDate(userId, today);
    }

    // Mark assignment completed
    await DailyAssignmentRepository.markAssignmentCompleted(userId, today);

    // Calculate streak
    const streakResult = this.calculateStreak(user, today);

    // Update user record with new streak
    await UserRepository.updateStreak(userId, streakResult);

    return {
      success: true,
      current_streak: streakResult.currentStreak,
      longest_streak: streakResult.longestStreak,
      last_completed_date: streakResult.lastCompletedDate,
      assigned_date: today,
      is_completed: true,
    };
  }
}

