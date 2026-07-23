import db from '../config/db.js';

/**
 * Create a new user
 * @param {Object} param0
 * @param {string} param0.full_name
 * @param {string} param0.email
 * @param {string} param0.password_hash
 * @param {string} [param0.role='user']
 * @returns {Object} created user (without password)
 */
export const createUser = async ({ full_name, email, password_hash, role = 'user' }) => {
    const res = await db.query(
        `INSERT INTO users (full_name, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, full_name, email, role, is_active`,
        [full_name, email, password_hash, role, true]
    );
    return res.rows[0];
};


/**
 * Find a user by email (including password_hash)
 * @param {string} email
 * @returns {Object|null}
 */
export const findByEmail = async (email) => {
    const res = await db.query('SELECT * FROM users WHERE email=$1', [email]);
    return res.rows[0] || null;
};

/**
 * Find a user by ID (without password_hash)
 * @param {string} id - UUID
 * @returns {Object|null}
 */
export const findById = async (id) => {
    const res = await db.query(
        'SELECT id, full_name, email, role, is_active, created_at, updated_at FROM users WHERE id=$1',
        [id]
    );
    return res.rows[0] || null;
};

/**
 * List all users with pagination
 * @param {Object} [filters]
 * @param {number} [filters.page=1]
 * @param {number} [filters.limit=20]
 * @returns {Array} List of users
 */
export const findAll = async ({ page = 1, limit = 20 } = {}) => {
    const offset = (page - 1) * limit;
    const res = await db.query(
        'SELECT id, full_name, email, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
    );
    return res.rows;
};

/**
 * Update a user's details
 * @param {string} id - UUID
 * @param {Object} param1
 * @param {string} param1.full_name
 * @param {string} param1.email
 * @param {string} param1.role
 * @param {boolean} param1.is_active
 * @returns {Object} Updated user
 */
export const updateUser = async (id, data) => {
    // Build dynamic query
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
        fields.push(`${key}=$${idx}`);
        values.push(value);
        idx++;
    }

    // Add updated_at
    fields.push(`updated_at=NOW()`);

    const query = `UPDATE users SET ${fields.join(', ')} WHERE id=$${idx} RETURNING id, full_name, email, role, is_active, created_at, updated_at`;
    values.push(id);

    const res = await db.query(query, values);
    return res.rows[0];
};

/**
 * Enable a user
 * @param {string} id - UUID
 * @returns {Object} Updated user
 */
export const enableUser = async (id) => {
    const res = await db.query(
        `UPDATE users 
         SET is_active = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING id, full_name, email, role, is_active, created_at, updated_at`,
        [true, id]
    );
    return res.rows[0];
};

/**
 * Disable a user
 * @param {string} id - UUID
 * @returns {Object} Updated user
 */
export const disableUser = async (id) => {
    const res = await db.query(
        `UPDATE users 
         SET is_active = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING id, full_name, email, role, is_active, created_at, updated_at`,
        [false, id]
    );
    return res.rows[0];
};
