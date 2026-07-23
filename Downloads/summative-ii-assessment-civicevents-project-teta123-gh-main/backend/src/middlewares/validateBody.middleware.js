import { validationResult } from 'express-validator';

/**
 * Middleware to validate request body using express-validator
 */
const validateBody = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        // Return first error or all errors
        return res.status(400).json({
            status: 400,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg,
            })),
        });
    }

    // Proceed if no errors
    next();
};

export default validateBody;
