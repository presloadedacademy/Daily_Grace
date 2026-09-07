import { MotivationRepository } from '../repositories/motivationRepository.js';
import { DailyAssignmentRepository } from '../repositories/dailyAssignmentRepository.js';
import { AppError } from './authService.js';
import { isValidUuid } from '../utils/cryptoUtils.js';

export class MotivationService {
  /**
   * Retrieve or atomically assign today's motivation for an authenticated user.
   * @param {string} userId UUID of authenticated user
   * @param {string} [customDate] Optional YYYY-MM-DD date string (used for testing or explicit timezone sync)
   */
  static async getTodaysMotivation(userId, customDate = null) {
    if (!userId || !isValidUuid(userId)) {
      throw new AppError('User authentication required.', 401, 'UNAUTHORIZED');
    }

    // Determine today's date in YYYY-MM-DD format
    const today = customDate || new Date().toISOString().split('T')[0];

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
        assigned_date: existing.assigned_date,
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
      assigned_date: confirmed.assigned_date,
    };
  }
}

