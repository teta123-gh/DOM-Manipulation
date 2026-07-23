import db from '../config/db.js';

// Create feedback
export const createFeedback = async ({ user_id, event_id, rating, comment }) => {
    const res = await db.query(
        `INSERT INTO event_feedback (user_id, event_id, rating, comment)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [user_id, event_id, rating, comment]
    );
    return res.rows[0];
};

// Update feedback
export const updateFeedback = async (id, { rating, comment }) => {
    const res = await db.query(
        `UPDATE event_feedback
         SET rating=$1, comment=$2, updated_at=NOW()
         WHERE id=$3
         RETURNING *`,
        [rating, comment, id]
    );
    return res.rows[0];
};

// Get feedback for an event
export const findByEvent = async (event_id) => {
    const res = await db.query(
        `SELECT ef.*, u.full_name, u.email
         FROM event_feedback ef
         JOIN users u ON ef.user_id = u.id
         WHERE ef.event_id=$1
         ORDER BY ef.created_at DESC`,
        [event_id]
    );
    return res.rows;
};

// Get feedback by a user
export const findByUser = async (user_id) => {
    const res = await db.query(
        `SELECT ef.*, e.title, e.starts_at
         FROM event_feedback ef
         JOIN events e ON ef.event_id = e.id
         WHERE ef.user_id=$1
         ORDER BY ef.created_at DESC`,
        [user_id]
    );
    return res.rows;
};
