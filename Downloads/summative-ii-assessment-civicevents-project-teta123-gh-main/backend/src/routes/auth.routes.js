import express from 'express';
import * as controller from '../controllers/auth.controller.js';
import { body } from 'express-validator';
import validateBody from '../middlewares/validateBody.middleware.js';

const router = express.Router();

// Signup with validation
router.post(
    '/signup',
    [
        body('full_name').notEmpty().withMessage('Full name is required'),
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    ],
    validateBody,
    controller.signup
);

// Login with validation
router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    validateBody,
    controller.login
);

export default router;
