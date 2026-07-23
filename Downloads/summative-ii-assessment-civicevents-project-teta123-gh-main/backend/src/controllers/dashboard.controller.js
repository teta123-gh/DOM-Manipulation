import * as Dashboard from '../models/dashboard.model.js';

export const getAdminDashboard = async (req, res, next) => {
    try {
        // Only admin can access this
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }

        const data = await Dashboard.getAdminStats();
        res.status(200).json({
            status: 200,
            message: 'Admin dashboard data fetched successfully',
            data
        });
    } catch (err) {
        next(err);
    }
};

export const getUserDashboard = async (req, res, next) => {
    try {
        const data = await Dashboard.getUserStats(req.user.id);
        res.status(200).json({
            status: 200,
            message: 'User dashboard data fetched successfully',
            data
        });
    } catch (err) {
        next(err);
    }
};
