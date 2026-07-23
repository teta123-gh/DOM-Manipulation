/**
 * Global error handler middleware
 * Should be the last middleware added in app.js
 */
const errorHandler = (err, req, res, next) => {
    console.error(err); // Log the error for debugging

    // Default to 500 Internal Server Error
    let status = err.status || 500;
    let message = err.message || 'Internal Server Error';

    // Handle specific known errors (optional)
    if (err.name === 'ValidationError') {
        status = 400;
        message = err.message;
    } else if (err.name === 'UnauthorizedError') {
        status = 401;
        message = 'Invalid or missing token';
    } else if (err.code === '23505') {
        // Postgres unique violation
        status = 409;
        message = 'Duplicate entry';
    }

    return res.status(status).json({
        status,
        message,
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    });
};

export default errorHandler;
