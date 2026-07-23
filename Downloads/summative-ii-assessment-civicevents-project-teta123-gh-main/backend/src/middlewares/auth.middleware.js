import jwt from 'jsonwebtoken';
import * as Users from '../models/users.model.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ status: 401, message: 'Authorization header missing' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await Users.findById(decoded.id);
        if (!user) return res.status(401).json({ status: 401, message: 'User not found' });

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ status: 401, message: 'Invalid or expired token' });
    }
};

// Role-based access control
export const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ status: 403, message: 'Forbidden: insufficient permissions' });
        }
        next();
    };
};
