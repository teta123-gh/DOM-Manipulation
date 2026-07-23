import express from 'express';
import * as controller from '../controllers/announcements.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { body } from 'express-validator';
import { uploadAudio } from '../middlewares/upload.middleware.js';
import validateBody from '../middlewares/validateBody.middleware.js';

const router = express.Router();

router.get('/', authenticate, controller.getAllAnnouncements);
router.get('/:id', authenticate, controller.getAnnouncementById);

router.post(
    '/',
    authenticate,
    authorize(['admin']),
    uploadAudio.single('audio'),
    [
        body('title').notEmpty().withMessage('Title is required'),
        body('published')
            .optional()
            .isBoolean()
            .withMessage('Published must be a boolean'),
    ],
    validateBody,
    controller.createAnnouncement
);

router.put(
    '/:id',
    authenticate,
    authorize(['admin']),
    uploadAudio.single('audio'),
    [
        body('title').notEmpty().withMessage('Title is required'),
    ],
    validateBody,
    controller.updateAnnouncement
);
router.patch('/:id/publish', authenticate, authorize(['admin']), controller.publishAnnouncement);
router.patch('/:id/unpublish', authenticate, authorize(['admin']), controller.unpublishAnnouncement);
router.delete('/:id', authenticate, authorize(['admin']), controller.deleteAnnouncement);

export default router;
