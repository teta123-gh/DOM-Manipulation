import express from 'express';
import { getAdminDashboard, getUserDashboard } from '../controllers/dashboard.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Admin-only route
router.get('/admin', authenticate, authorize(['admin']), getAdminDashboard);

// User route (any authenticated user)
router.get('/me', authenticate, getUserDashboard);

export default router;
