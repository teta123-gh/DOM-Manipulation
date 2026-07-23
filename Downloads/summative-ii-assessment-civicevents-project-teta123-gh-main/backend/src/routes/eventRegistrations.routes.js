import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import * as Controller from '../controllers/eventRegistrations.controller.js';

const router = express.Router();

// User routes
router.post('/register', authenticate, Controller.registerForEvent);
router.post('/cancel', authenticate, Controller.cancelRegistration);
router.get('/my-registrations', authenticate, Controller.getUserRegistrations);

// Admin route
router.get('/event/:event_id/attendees', authenticate, authorize(['admin']), Controller.getEventAttendees);

export default router;
