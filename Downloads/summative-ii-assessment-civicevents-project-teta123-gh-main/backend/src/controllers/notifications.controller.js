import * as Notifications from '../models/notifications.model.js';

/**
 * Create a new notification
 */
export const create = async (req, res, next) => {
    try {
        const { title, message, type, recipient_id, metadata } = req.body;

        const notification = await Notifications.create({
            title,
            message,
            type,
            recipient_id: recipient_id || null,
            metadata: metadata || {},
            created_by: req.user?.id || null
        });

        return res.status(201).json({
            status: 201,
            message: 'Notification created successfully',
            data: notification
        });
    } catch (err) {
        next(err);
    }
};

/**
 * List notifications for the logged-in user
 */
export const list = async (req, res, next) => {
    try {
        const userId = req.user?.id || null;
        const notifications = await Notifications.findAllForUser(userId);

        return res.status(200).json({
            status: 200,
            message: 'Notifications fetched successfully',
            data: notifications
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get a single notification by ID
 */
export const get = async (req, res, next) => {
    try {
        const { id } = req.params;
        const notification = await Notifications.findById(id);

        if (!notification) {
            return res.status(404).json({
                status: 404,
                message: 'Notification not found'
            });
        }

        return res.status(200).json({
            status: 200,
            message: 'Notification fetched successfully',
            data: notification
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Delete a notification
 */
export const remove = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await Notifications.findById(id);
        if (!existing) {
            return res.status(404).json({
                status: 404,
                message: 'Notification not found'
            });
        }

        await Notifications.remove(id);

        return res.status(200).json({
            status: 200,
            message: 'Notification deleted successfully'
        });
    } catch (err) {
        next(err);
    }
};
