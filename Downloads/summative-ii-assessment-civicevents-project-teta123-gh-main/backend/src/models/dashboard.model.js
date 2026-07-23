import db from '../config/db.js';

// Dashboard queries for admin
export const getAdminStats = async () => {
    const stats = {};

    // Users
    const users = await db.query(`
        SELECT 
            COUNT(*) AS total_users,
            COUNT(*) FILTER (WHERE is_active = true) AS active_users,
            COUNT(*) FILTER (WHERE is_active = false) AS inactive_users
        FROM users
    `);
    stats.users = users.rows[0];

    // Events
    const events = await db.query(`
        SELECT 
            COUNT(*) AS total_events,
            COUNT(*) FILTER (WHERE starts_at > NOW()) AS upcoming_events,
            COUNT(*) FILTER (WHERE ends_at < NOW()) AS past_events
        FROM events
    `);
    stats.events = events.rows[0];

    // Registrations
    const registrations = await db.query(`SELECT COUNT(*) AS total_registrations FROM event_registrations`);
    stats.registrations = registrations.rows[0];

    // Feedback
    const feedbacks = await db.query(`SELECT COUNT(*) AS total_feedback FROM event_feedback`);
    stats.feedbacks = feedbacks.rows[0];

    // Promos & Announcements
    const promos = await db.query(`SELECT COUNT(*) AS total_promos FROM promos`);
    const announcements = await db.query(`SELECT COUNT(*) AS total_announcements FROM announcements`);
    stats.promos = promos.rows[0];
    stats.announcements = announcements.rows[0];

    // Notifications
    const notifications = await db.query(`
        SELECT COUNT(*) AS total_notifications FROM notifications
    `);
    stats.notifications = notifications.rows[0];

    // User growth by month (past 6 months)
    const growth = await db.query(`
        SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS new_users
        FROM users
        WHERE created_at > NOW() - INTERVAL '6 months'
        GROUP BY month
        ORDER BY month ASC
    `);
    stats.user_growth = growth.rows;

    return stats;
};

// Dashboard queries for regular user
export const getUserStats = async (userId) => {
    const stats = {};

    // User’s event registrations
    const registrations = await db.query(`
        SELECT COUNT(*) AS total_registered_events
        FROM event_registrations
        WHERE user_id = $1
    `, [userId]);
    stats.registrations = registrations.rows[0];

    // User feedback
    const feedbacks = await db.query(`
        SELECT COUNT(*) AS total_feedbacks
        FROM event_feedback
        WHERE user_id = $1
    `, [userId]);
    stats.feedbacks = feedbacks.rows[0];

    // Notifications
    const notifications = await db.query(`
        SELECT 
            COUNT(*) AS total_notifications,
            COUNT(*) FILTER (WHERE read = false) AS unread_notifications
        FROM notifications
        WHERE recipient_id = $1 OR recipient_id IS NULL
    `, [userId]);
    stats.notifications = notifications.rows[0];

    // Announcements and promos
    const announcements = await db.query(`SELECT COUNT(*) AS total_announcements FROM announcements`);
    const promos = await db.query(`SELECT COUNT(*) AS total_promos FROM promos`);
    stats.announcements = announcements.rows[0];
    stats.promos = promos.rows[0];

    return stats;
};
