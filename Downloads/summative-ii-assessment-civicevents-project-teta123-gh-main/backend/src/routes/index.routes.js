import express from 'express';

// Auth & core modules
import auth from './auth.routes.js';
import users from './users.routes.js';

// Events-related modules
import events from './events.routes.js';
import eventRegistrations from './eventRegistrations.routes.js';
import eventFeedback from './eventFeedback.routes.js';

// Content & engagement modules
import announcements from './announcements.routes.js';
import promos from './promos.routes.js';
import notifications from './notifications.routes.js';
import dashboard from './dashboard.routes.js';

const router = express.Router();

/**
 * Public routes
 */
router.use('/auth', auth);

/**
 * Protected routes (require authentication)
 */
router.use('/users', users);
router.use('/events', events);
router.use('/event-registrations', eventRegistrations);
router.use('/event-feedback', eventFeedback);
router.use('/announcements', announcements);
router.use('/promos', promos);
router.use('/notifications', notifications);
router.use('/dashboard', dashboard);

export default router;
