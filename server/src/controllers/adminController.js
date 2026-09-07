import { AdminService } from '../services/adminService.js';

export class AdminController {
  /**
   * GET /api/admin/dashboard
   */
  static async getDashboard(req, res, next) {
    try {
      const data = await AdminService.getDashboard();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/stats
   */
  static async getStats(req, res, next) {
    try {
      const stats = await AdminService.getStats();
      res.status(200).json({
        success: true,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/motivations
   */
  static async listMotivations(req, res, next) {
    try {
      const { page, limit, q, status } = req.query;
      const result = await AdminService.listMotivations({ page, limit, q, status });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/motivations/:id
   */
  static async getMotivation(req, res, next) {
    try {
      const { id } = req.params;
      const motivation = await AdminService.getMotivationById(id);

      res.status(200).json({
        success: true,
        data: motivation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/motivations
   */
  static async createMotivation(req, res, next) {
    try {
      const { title, verse, reference, reflection, prayer, status } = req.body;
      const created = await AdminService.createMotivation({
        title,
        verse,
        reference,
        reflection,
        prayer,
        status,
      });

      res.status(201).json({
        success: true,
        message: 'Motivation created successfully.',
        data: created,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH / PUT /api/admin/motivations/:id
   */
  static async updateMotivation(req, res, next) {
    try {
      const { id } = req.params;
      const { title, verse, reference, reflection, prayer, status } = req.body;
      const updated = await AdminService.updateMotivation(id, {
        title,
        verse,
        reference,
        reflection,
        prayer,
        status,
      });

      res.status(200).json({
        success: true,
        message: 'Motivation updated successfully.',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/motivations/:id/status
   */
  static async updateMotivationStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await AdminService.updateMotivationStatus(id, status);

      res.status(200).json({
        success: true,
        message: `Motivation status updated to ${updated.status}.`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/admin/motivations/:id
   */
  static async deleteMotivation(req, res, next) {
    try {
      const { id } = req.params;
      const result = await AdminService.deleteMotivation(id);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/users
   */
  static async listUsers(req, res, next) {
    try {
      const { page, limit, q, role } = req.query;
      const result = await AdminService.listUsers({ page, limit, q, role });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/change-password
   */
  static async changePassword(req, res, next) {
    try {
      const adminUserId = req.user.userId;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      const result = await AdminService.changeAdminPassword(adminUserId, {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

