import * as Feedback from '../models/eventFeedback.model.js';
import * as Events from '../models/events.model.js';

export const createFeedback = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const { event_id, rating, comment } = req.body;

        // Check event exists
        const event = await Events.findById(event_id);
        if (!event) return res.status(404).json({ status: 404, message: 'Event not found' });

        // Create feedback
        const feedback = await Feedback.createFeedback({ user_id, event_id, rating, comment });
        res.status(201).json({ status: 201, message: 'Feedback submitted', data: feedback });
    } catch (err) {
        next(err);
    }
};

export const updateFeedback = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const { id } = req.params;
        const { rating, comment } = req.body;

        // Optional: validate that feedback belongs to user
        const userFeedback = await Feedback.findByUser(user_id);
        const feedback = userFeedback.find(f => f.id === id);
        if (!feedback) return res.status(403).json({ status: 403, message: 'Cannot update this feedback' });

        const updated = await Feedback.updateFeedback(id, { rating, comment });
        res.status(200).json({ status: 200, message: 'Feedback updated', data: updated });
    } catch (err) {
        next(err);
    }
};

export const getEventFeedback = async (req, res, next) => {
    try {
        const { event_id } = req.params;
        
        const event = await Events.findById(event_id);
        if (!event) return res.status(404).json({ status: 404, message: 'Event not found' });

        const feedbacks = await Feedback.findByEvent(event_id);
        res.status(200).json({ status: 200, data: feedbacks });
    } catch (err) {
        next(err);
    }
};

export const getUserFeedback = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const feedbacks = await Feedback.findByUser(user_id);
        res.status(200).json({ status: 200, data: feedbacks });
    } catch (err) {
        next(err);
    }
};
