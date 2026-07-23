import fs from 'fs';
import path from 'path';
import * as Events from '../models/events.model.js';
import * as Notifications from '../models/notifications.model.js';

export const create = async (req, res, next) => {
    try {
        const { title, description, location, starts_at, ends_at } = req.body;

        // Base event data
        const eventData = {
            title,
            description,
            location,
            starts_at,
            ends_at,
            created_at: new Date(),
            updated_at: new Date(),
            metadata: {}
        };

        // If an image was uploaded, store its URL in metadata
        if (req.file) {
            const imageUrl = `${req.protocol}://${req.get('host')}/uploads/events/${req.file.filename}`;
            eventData.metadata.image_url = imageUrl;
        }

        // Create the event
        const createdEvent = await Events.create(eventData);

        // Create a notification for all users
        await Notifications.create({
            title: 'New Event Published',
            message: `A new event titled "${createdEvent.title}" has been added!`,
            type: 'event',
            recipient_id: null, // null → means broadcast to all
            metadata: {
                event_id: createdEvent.id
            },
            created_by: req.user?.id || null
        });

        return res.status(201).json({
            status: 201,
            message: 'Event created successfully and notification sent',
            data: createdEvent,
        });
    } catch (err) {
        next(err);
    }
};

export const list = async (req, res, next) => {
    try {
        const data = await Events.findAll(req.query);
        return res.status(200).json({
            status: 200,
            message: 'Events fetched successfully',
            data,
        });
    } catch (err) {
        next(err);
    }
};

export const get = async (req, res, next) => {
    try {
        const event = await Events.findById(req.params.id);
        if (!event)
            return res.status(404).json({
                status: 404,
                message: 'Event not found',
            });

        return res.status(200).json({
            status: 200,
            message: 'Event fetched successfully',
            data: event,
        });
    } catch (err) {
        next(err);
    }
};

export const update = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if event exists
        const existingEvent = await Events.findById(id);
        if (!existingEvent) {
            return res.status(404).json({
                status: 404,
                message: 'Event not found',
            });
        }

        // Prepare updated data
        const { title, description, location, starts_at, ends_at } = req.body;
        const metadata = { ...existingEvent.metadata };

        // Handle new image upload
        if (req.file) {
            // Remove old image if it exists
            if (metadata.image_url) {
                const oldImagePath = path.join(
                    process.cwd(),
                    'uploads',
                    'events',
                    path.basename(metadata.image_url)
                );
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath); // Delete the old file
                }
            }

            // Add new image URL
            const imageUrl = `${req.protocol}://${req.get('host')}/uploads/events/${req.file.filename}`;
            metadata.image_url = imageUrl;
        }

        // Update the event data
        const updatedData = {
            title: title ?? existingEvent.title,
            description: description ?? existingEvent.description,
            location: location ?? existingEvent.location,
            starts_at: starts_at ?? existingEvent.starts_at,
            ends_at: ends_at ?? existingEvent.ends_at,
            metadata,
            updated_at: new Date(),
        };

        // Save to DB
        const updated = await Events.update(id, updatedData);

        return res.status(200).json({
            status: 200,
            message: 'Event updated successfully',
            data: updated,
        });
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if event exists
        const existingEvent = await Events.findById(id);
        if (!existingEvent) {
            return res.status(404).json({
                status: 404,
                message: 'Event not found',
            });
        }

        // Proceed to delete
        await Events.remove(id);

        return res.status(200).json({
            status: 200,
            message: 'Event deleted successfully',
            data: { id, title: existingEvent.title },
        });
    } catch (err) {
        next(err);
    }
};

