import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as Users from '../models/users.model.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_EXPIRES_IN = '1h';

// Password strength regex: 
// - Min 8 chars, at least one uppercase, one lowercase, one number, one special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

export const signup = async (req, res, next) => {
    try {
        const { full_name, email, password, role } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({ status: 400, message: 'Missing required fields' });
        }

        if (!PASSWORD_REGEX.test(password)) {
            return res.status(400).json({
                status: 400,
                message: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.'
            });
        }

        const existingUser = await Users.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ status: 409, message: 'Email already in use' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const user = await Users.createUser({ full_name, email, password_hash, role });

        return res.status(201).json({
            status: 201,
            message: 'User created successfully',
            data: { id: user.id, full_name: user.full_name, email: user.email, role: user.role }
        });
    } catch (err) {
        next(err);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ status: 400, message: 'Email and password required' });
        }

        const user = await Users.findByEmail(email);
        if (!user) return res.status(401).json({ status: 401, message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ status: 401, message: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        return res.status(200).json({
            status: 200,
            message: 'Login successful',
            data: {
                token,
                user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role }
            }
        });
    } catch (err) {
        next(err);
    }
};
