import db from '../config/db.js';

// Register a user for an event
export const register = async (user_id, event_id) => {
    const res = await db.query(
        `INSERT INTO event_registrations (user_id, event_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, event_id) DO NOTHING
         RETURNING *`,
        [user_id, event_id]
    );
    return res.rows[0];
};

// Cancel registration
export const cancelRegistration = async (user_id, event_id) => {
    const res = await db.query(
        `UPDATE event_registrations
         SET status='cancelled', updated_at=NOW()
         WHERE user_id=$1 AND event_id=$2
         RETURNING *`,
        [user_id, event_id]
    );
    return res.rows[0];
};

// Get all registrations for an event
export const findByEvent = async (event_id) => {
    const res = await db.query(
        `SELECT er.*, u.full_name, u.email
         FROM event_registrations er
         JOIN users u ON er.user_id = u.id
         WHERE er.event_id=$1 AND er.status='registered'`,
        [event_id]
    );
    return res.rows;
};

// Get all events a user has registered for
export const findByUser = async (user_id) => {
    const res = await db.query(
        `SELECT er.*, e.title, e.starts_at, e.ends_at, e.location
         FROM event_registrations er
         JOIN events e ON er.event_id = e.id
         WHERE er.user_id=$1`,
        [user_id]
    );
    return res.rows;
};