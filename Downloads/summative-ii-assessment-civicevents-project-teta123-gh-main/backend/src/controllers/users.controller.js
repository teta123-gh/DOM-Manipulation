import * as Users from '../models/users.model.js';

// Get all users
export const list = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const users = await Users.findAll({ page: Number(page), limit: Number(limit) });
        return res.status(200).json({
            status: 200,
            message: 'Users retrieved successfully',
            data: users,
        });
    } catch (err) {
        next(err);
    }
};

// Get single user
export const get = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await Users.findById(id);
        if (!user) {
            return res.status(404).json({ status: 404, message: 'User not found' });
        }
        return res.status(200).json({
            status: 200,
            message: 'User retrieved successfully',
            data: user,
        });
    } catch (err) {
        next(err);
    }
};

// Enable user
export const enable = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await Users.enableUser(id);
        return res.status(200).json({
            status: 200,
            message: 'User enabled successfully',
            data: user,
        });
    } catch (err) {
        next(err);
    }
};

// Disable user
export const disable = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await Users.disableUser(id);
        return res.status(200).json({
            status: 200,
            message: 'User disabled successfully',
            data: user,
        });
    } catch (err) {
        next(err);
    }
};

// Get own profile
export const getSelf = async (req, res, next) => {
    try {
        const user = await Users.findById(req.user.id);
        return res.status(200).json({
            status: 200,
            message: 'User profile retrieved successfully',
            data: user,
        });
    } catch (err) {
        next(err);
    }
};

// Update own profile
export const updateSelf = async (req, res, next) => {
    try {
        const { full_name, email } = req.body;

        // Check if email is being updated and if it already exists
        if (email) {
            const existingUser = await Users.findByEmail(email);
            if (existingUser && existingUser.id !== req.user.id) {
                return res.status(409).json({
                    status: 409,
                    message: 'Email is already in use',
                });
            }
        }

        // Only allow updating full_name and email
        const updatedData = {};
        if (full_name) updatedData.full_name = full_name;
        if (email) updatedData.email = email;

        const user = await Users.updateUser(req.user.id, updatedData);

        return res.status(200).json({
            status: 200,
            message: 'Profile updated successfully',
            data: user,
        });
    } catch (err) {
        next(err);
    }
};
