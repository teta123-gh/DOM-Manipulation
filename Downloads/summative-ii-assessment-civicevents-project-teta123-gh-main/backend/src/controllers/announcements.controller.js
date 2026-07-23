import * as AnnouncementModel from '../models/announcements.model.js';
import * as NotificationModel from '../models/notifications.model.js';

/**
 * Get all announcements
 */
export const getAllAnnouncements = async (req, res, next) => {
    try {
        const announcements = await AnnouncementModel.findAll(req.query);
        return res.status(200).json({
            status: 200,
            message: 'Announcements retrieved successfully',
            data: announcements
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get a single announcement
 */
export const getAnnouncementById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const announcement = await AnnouncementModel.findById(id);
        if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
        
        return res.status(200).json({
            status: 200,
            message: 'Announcement retrieved successfully',
            data: announcement
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new announcement (with audio file upload)
 */
export const createAnnouncement = async (req, res, next) => {
    try {
        const { title, published = true } = req.body;

        // Ensure file was uploaded
        if (!req.file) {
            return res.status(400).json({
                status: 400,
                message: 'Audio file is required',
            });
        }

        // Construct full file URL dynamically (based on your server’s base URL)
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const audio_url = `${baseUrl}/uploads/announcements/${req.file.filename}`;

        // Create announcement
        const created = await AnnouncementModel.create({
            title,
            audio_url,
            published,
        });

        // Create a broadcast notification for all users
        await NotificationModel.create({
            title: 'New Announcement Published',
            message: `A new announcement titled "${title}" has been added.`,
            type: 'announcement',
            recipient_id: null, // broadcast
            metadata: { announcement_id: created.id },
            created_by: req.user?.id || null,
        });

        return res.status(201).json({
            status: 201,
            message: 'Announcement created successfully',
            data: created,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update an announcement
 */
export const updateAnnouncement = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if announcement exists
        const existing = await AnnouncementModel.findById(id);
        if (!existing) {
            return res.status(404).json({
                status: 404,
                message: 'Announcement not found',
            });
        }

        const updated = await AnnouncementModel.update(id, req.body);

        return res.status(200).json({
            status: 200,
            message: 'Announcement updated successfully',
            data: updated,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete an announcement
 */
export const deleteAnnouncement = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if announcement exists
        const existing = await AnnouncementModel.findById(id);
        if (!existing) {
            return res.status(404).json({
                status: 404,
                message: 'Announcement not found',
            });
        }

        await AnnouncementModel.remove(id);

        return res.status(200).json({
            status: 200,
            message: 'Announcement deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Publish an announcement
 */
export const publishAnnouncement = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if announcement exists
        const existing = await AnnouncementModel.findById(id);
        if (!existing) {
            return res.status(404).json({
                status: 404,
                message: 'Announcement not found',
            });
        }

        const announcement = await AnnouncementModel.publish(id);

        // Optional: create a notification when published
        await NotificationModel.create({
            title: 'Announcement Published',
            message: `The announcement "${announcement.title}" is now live.`,
            type: 'announcement',
            recipient_id: null,
            metadata: { announcement_id: announcement.id },
            created_by: req.user?.id || null
        });

        return res.status(200).json({
            status: 200,
            message: 'Announcement published successfully',
            data: announcement,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Unpublish an announcement
 */
export const unpublishAnnouncement = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if announcement exists
        const existing = await AnnouncementModel.findById(id);
        if (!existing) {
            return res.status(404).json({
                status: 404,
                message: 'Announcement not found',
            });
        }
        
        const announcement = await AnnouncementModel.unpublish(id);

        return res.status(200).json({
            status: 200,
            message: 'Announcement unpublished successfully',
            data: announcement,
        });
    } catch (error) {
        next(error);
    }
};
