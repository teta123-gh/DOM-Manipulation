import * as EventRegistrations from '../models/eventRegistrations.model.js';
import * as Events from '../models/events.model.js';

export const registerForEvent = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const { event_id } = req.body;

        const event = await Events.findById(event_id);
        if (!event) return res.status(404).json({ status: 404, message: 'Event not found' });
        
        const registration = await EventRegistrations.register(user_id, event_id);
        if (!registration) return res.status(409).json({ status: 409, message: 'Already registered' });

        res.status(201).json({ status: 201, message: 'Registered successfully', data: registration });
    } catch (err) {
        next(err);
    }
};

export const cancelRegistration = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const { event_id } = req.body;

        const event = await Events.findById(event_id);
        if (!event) return res.status(404).json({ status: 404, message: 'Event not found' });

        const cancelled = await EventRegistrations.cancelRegistration(user_id, event_id);
        if (!cancelled) return res.status(404).json({ status: 404, message: 'Registration not found' });

        res.status(200).json({ status: 200, message: 'Registration cancelled', data: cancelled });
    } catch (err) {
        next(err);
    }
};

export const getEventAttendees = async (req, res, next) => {
    try {
        const { event_id } = req.params;

        const event = await Events.findById(event_id);
        if (!event) return res.status(404).json({ status: 404, message: 'Event not found' });

        const attendees = await EventRegistrations.findByEvent(event_id);

        res.status(200).json({ 
            status: 200, 
            message: 'Event attendees retrieved successfully', 
            data: attendees 
        });
    } catch (err) {
        next(err);
    }
};

export const getUserRegistrations = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const registrations = await EventRegistrations.findByUser(user_id);

        res.status(200).json({ 
            status: 200, 
            message: 'Event registrations retrieved successfully', 
            data: registrations 
        });
    } catch (err) {
        next(err);
    }
};
