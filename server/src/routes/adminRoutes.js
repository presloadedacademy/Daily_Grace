import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Strict Admin-only middleware pipeline for all routes
router.use(authenticateToken, requireAdmin);

// Dashboard & Overview
router.get('/dashboard', AdminController.getDashboard);
router.get('/stats', AdminController.getStats);

// Motivation CRUD
router.get('/motivations', AdminController.listMotivations);
router.get('/motivations/:id', AdminController.getMotivation);
router.post('/motivations', AdminController.createMotivation);
router.patch('/motivations/:id', AdminController.updateMotivation);
router.put('/motivations/:id', AdminController.updateMotivation);
router.patch('/motivations/:id/status', AdminController.updateMotivationStatus);
router.delete('/motivations/:id', AdminController.deleteMotivation);

// User Management
router.get('/users', AdminController.listUsers);

// Profile & Security
router.post('/change-password', AdminController.changePassword);
router.post('/profile/change-password', AdminController.changePassword);

export default router;

