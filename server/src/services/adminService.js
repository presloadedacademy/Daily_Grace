import bcrypt from 'bcrypt';
import { MotivationRepository } from '../repositories/motivationRepository.js';
import { UserRepository } from '../repositories/userRepository.js';
import { AppError } from './authService.js';
import { validateMotivationRecord } from '../utils/contentValidator.js';
import { isValidUuid } from '../utils/cryptoUtils.js';

export class AdminService {
  /**
   * Get administrative content & user statistics.
   */
  static async getStats() {
    const motivationStats = await MotivationRepository.getAdminStats();
    const totalUsers = await UserRepository.countTotalUsers();
    const totalAdmins = await UserRepository.countTotalAdmins();

    return {
      totalMotivations: motivationStats.totalMotivations,
      publishedMotivations: motivationStats.publishedMotivations,
      draftMotivations: motivationStats.draftMotivations,
      totalUsers,
      totalAdmins,
    };
  }

  /**
   * Get comprehensive dashboard data including real statistics, today's motivation, and recent motivations.
   */
  static async getDashboard() {
    const stats = await this.getStats();
    const recentMotivations = await MotivationRepository.getRecentMotivations(5);
    const todaysMotivation = await MotivationRepository.getTodaysFeaturedMotivation();

    return {
      stats,
      todaysMotivation,
      recentMotivations,
    };
  }

  /**
   * List motivations with server-side pagination, search, and status filtering.
   */
  static async listMotivations({ page = 1, limit = 20, q = '', status = 'all' }) {
    return MotivationRepository.adminListMotivations({ page, limit, q, status });
  }

  /**
   * Get a single motivation by ID.
   */
  static async getMotivationById(id) {
    if (!id) {
      throw new AppError('Motivation ID is required.', 400, 'VALIDATION_ERROR');
    }

    const motivation = await MotivationRepository.findById(id);
    if (!motivation) {
      throw new AppError('Motivation not found.', 404, 'NOT_FOUND');
    }

    return motivation;
  }

  /**
   * Create a new motivation.
   */
  static async createMotivation({ title, verse, reference, reflection, prayer, status = 'draft' }) {
    const validation = validateMotivationRecord({ title, verse, reference, reflection, prayer }, 1);
    if (!validation.isValid) {
      throw new AppError(validation.errors[0] || 'All fields are required.', 400, 'VALIDATION_ERROR');
    }

    const cleanStatus = status === 'published' ? 'published' : 'draft';

    const newMotivation = await MotivationRepository.createMotivation({
      ...validation.sanitized,
      status: cleanStatus,
    });

    return newMotivation;
  }

  /**
   * Update an existing motivation.
   */
  static async updateMotivation(id, { title, verse, reference, reflection, prayer, status }) {
    await this.getMotivationById(id); // Throws 404 if not found

    const updatePayload = {};

    if (title !== undefined) {
      if (!title || !title.trim()) throw new AppError('Title is required.', 400, 'VALIDATION_ERROR');
      updatePayload.title = title.trim();
    }
    if (verse !== undefined) {
      if (!verse || !verse.trim()) throw new AppError('Bible verse is required.', 400, 'VALIDATION_ERROR');
      updatePayload.verse = verse.trim();
    }
    if (reference !== undefined) {
      if (!reference || !reference.trim()) throw new AppError('Scripture reference is required.', 400, 'VALIDATION_ERROR');
      updatePayload.reference = reference.trim();
    }
    if (reflection !== undefined) {
      if (!reflection || !reflection.trim()) throw new AppError('Reflection is required.', 400, 'VALIDATION_ERROR');
      updatePayload.reflection = reflection.trim();
    }
    if (prayer !== undefined) {
      if (!prayer || !prayer.trim()) throw new AppError('Prayer is required.', 400, 'VALIDATION_ERROR');
      updatePayload.prayer = prayer.trim();
    }
    if (status !== undefined) {
      if (status !== 'published' && status !== 'draft') {
        throw new AppError('Status must be either "draft" or "published".', 400, 'VALIDATION_ERROR');
      }
      updatePayload.status = status;
    }

    const updated = await MotivationRepository.updateMotivation(id, updatePayload);
    return updated;
  }

  /**
   * Fast toggle or update motivation status (published / draft).
   */
  static async updateMotivationStatus(id, status) {
    if (!status || (status !== 'published' && status !== 'draft')) {
      throw new AppError('Status must be either "draft" or "published".', 400, 'VALIDATION_ERROR');
    }
    return this.updateMotivation(id, { status });
  }

  /**
   * Safe deletion of a motivation.
   * If motivation was already delivered/assigned to users in daily_motivations,
   * prevent physical deletion and instruct the administrator to unpublish instead.
   */
  static async deleteMotivation(id) {
    await this.getMotivationById(id); // Throws 404 if not found

    const assignedCount = await MotivationRepository.countAssignmentsForMotivation(id);
    if (assignedCount > 0) {
      throw new AppError(
        'This motivation has already been assigned in user daily journeys and cannot be deleted. You can unpublish it instead to prevent new assignments.',
        400,
        'MOTIVATION_ASSIGNED_CANNOT_DELETE'
      );
    }

    await MotivationRepository.deleteMotivation(id);
    return {
      success: true,
      message: 'Motivation deleted successfully.',
    };
  }

  /**
   * List registered users with server-side pagination, search, and role filtering.
   */
  static async listUsers({ page = 1, limit = 20, q = '', role = 'all' }) {
    return UserRepository.adminListUsers({ page, limit, q, role });
  }

  /**
   * Securely change an authenticated administrator's password.
   */
  static async changeAdminPassword(adminUserId, { currentPassword, newPassword, confirmPassword }) {
    if (!adminUserId || !isValidUuid(adminUserId)) {
      throw new AppError('Invalid administrator session.', 401, 'UNAUTHORIZED');
    }

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required.', 400, 'VALIDATION_ERROR');
    }

    if (newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters long.', 400, 'VALIDATION_ERROR');
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      throw new AppError('New passwords do not match.', 400, 'VALIDATION_ERROR');
    }

    const admin = await UserRepository.findAuthUserById(adminUserId);
    if (!admin) {
      throw new AppError('Administrator account not found.', 404, 'NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isMatch) {
      throw new AppError('Incorrect current password.', 400, 'INVALID_CURRENT_PASSWORD');
    }

    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await UserRepository.updatePasswordHash(adminUserId, newPasswordHash);

    return {
      success: true,
      message: 'Password changed successfully.',
    };
  }
}

