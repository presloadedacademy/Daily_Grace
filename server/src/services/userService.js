import { UserRepository } from '../repositories/userRepository.js';
import { MotivationRepository } from '../repositories/motivationRepository.js';
import { AppError } from './authService.js';
import { isValidUuid } from '../utils/cryptoUtils.js';

export class UserService {
  /**
   * Get user profile by authenticated user ID.
   */
  static async getProfile(userId) {
    if (!userId || !isValidUuid(userId)) {
      throw new AppError('Invalid authentication session. Please log in again.', 401, 'UNAUTHORIZED');
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new AppError('User account not found.', 404, 'NOT_FOUND');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      email_verified: user.email_verified,
      notification_enabled: user.notification_enabled,
      onboarding_completed: Boolean(user.onboarding_completed),
      created_at: user.created_at,
    };
  }

  /**
   * Update authenticated user's name.
   */
  static async updateName(userId, name) {
    if (!userId || !isValidUuid(userId)) {
      throw new AppError('Invalid authentication session. Please log in again.', 401, 'UNAUTHORIZED');
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError('Name is required.', 400, 'VALIDATION_ERROR');
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      throw new AppError('Name must be at least 2 characters long.', 400, 'VALIDATION_ERROR');
    }

    const updatedUser = await UserRepository.updateProfile(userId, { name: trimmedName });
    if (!updatedUser) {
      throw new AppError('User account not found.', 404, 'NOT_FOUND');
    }

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role || 'user',
      email_verified: updatedUser.email_verified,
      notification_enabled: updatedUser.notification_enabled,
      onboarding_completed: Boolean(updatedUser.onboarding_completed),
      updated_at: updatedUser.updated_at,
    };
  }

  /**
   * Update notification preferences for the authenticated user.
   */
  static async updatePreferences(userId, notificationEnabled) {
    if (!userId || !isValidUuid(userId)) {
      throw new AppError('Invalid authentication session. Please log in again.', 401, 'UNAUTHORIZED');
    }

    if (typeof notificationEnabled !== 'boolean') {
      throw new AppError('Notification enabled must be a boolean value (true or false).', 400, 'VALIDATION_ERROR');
    }

    const updatedUser = await UserRepository.updatePreferences(userId, { notificationEnabled });
    if (!updatedUser) {
      throw new AppError('User account not found.', 404, 'NOT_FOUND');
    }

    return {
      notification_enabled: updatedUser.notification_enabled,
      onboarding_completed: Boolean(updatedUser.onboarding_completed),
    };
  }

  /**
   * Mark onboarding as completed for the authenticated user.
   */
  static async completeOnboarding(userId, completed = true) {
    if (!userId || !isValidUuid(userId)) {
      throw new AppError('Invalid authentication session. Please log in again.', 401, 'UNAUTHORIZED');
    }

    const updatedUser = await UserRepository.updateOnboardingStatus(userId, completed);
    if (!updatedUser) {
      throw new AppError('User account not found.', 404, 'NOT_FOUND');
    }

    return {
      success: true,
      onboarding_completed: Boolean(updatedUser.onboarding_completed),
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role || 'user',
        email_verified: updatedUser.email_verified,
        notification_enabled: updatedUser.notification_enabled,
        onboarding_completed: Boolean(updatedUser.onboarding_completed),
      },
    };
  }

  /**
   * Reset the daily motivation journey for the authenticated user only.
   */
  static async resetJourney(userId) {
    if (!userId || !isValidUuid(userId)) {
      throw new AppError('Invalid authentication session. Please log in again.', 401, 'UNAUTHORIZED');
    }

    await MotivationRepository.deleteUserAssignments(userId);

    return {
      success: true,
      message: 'Your Daily Grace journey has been reset from the beginning.',
    };
  }

  /**
   * Delete authenticated user's account and associated data.
   */
  static async deleteAccount(userId) {
    if (!userId || !isValidUuid(userId)) {
      throw new AppError('Invalid authentication session. Please log in again.', 401, 'UNAUTHORIZED');
    }

    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new AppError('User account not found.', 404, 'NOT_FOUND');
    }

    // If user is admin, prevent deleting the sole remaining administrator
    if (user.role === 'admin') {
      const adminCount = await UserRepository.countTotalAdmins();
      if (adminCount <= 1) {
        throw new AppError(
          'Cannot delete the last remaining administrator account. Please promote another administrator before deleting this account.',
          400,
          'LAST_ADMIN'
        );
      }
    }

    // Clean up daily motivations and user record
    await MotivationRepository.deleteUserAssignments(userId);
    await UserRepository.deleteUser(userId);

    return {
      success: true,
      message: 'Your account and all associated data have been permanently deleted.',
    };
  }
}


