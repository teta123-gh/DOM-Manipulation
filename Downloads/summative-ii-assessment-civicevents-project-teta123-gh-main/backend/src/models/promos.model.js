import db from '../config/db.js';

export const findAll = async ({ page = 1, limit = 20 } = {}) => {
    const offset = (page - 1) * limit;

    const { rows } = await db.query(
        `SELECT * FROM promos
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
    );

    const countRes = await db.query(`SELECT COUNT(*) FROM promos`);
    const total = parseInt(countRes.rows[0].count, 10);

    return {
        promos: rows,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        },
    };
};

export const findById = async (id) => {
    const res = await db.query(`SELECT * FROM promos WHERE id=$1`, [id]);
    return res.rows[0] || null;
};

export const create = async ({ title, description, video_url, caption_text, created_by }) => {
    const res = await db.query(
        `INSERT INTO promos (title, description, video_url, caption_text, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
        [title, description, video_url, caption_text, created_by]
    );
    return res.rows[0];
};

export const update = async (id, fields) => {
    // Build dynamic SQL
    const updates = [];
    const values = [];
    let index = 1;

    for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
            updates.push(`${key}=$${index}`);
            values.push(value);
            index++;
        }
    }

    if (updates.length === 0) return findById(id);

    const query = `
    UPDATE promos
    SET ${updates.join(', ')}, updated_at=NOW()
    WHERE id=$${index}
    RETURNING *`;

    const res = await db.query(query, [...values, id]);
    return res.rows[0] || null;
};

export const remove = async (id) => {
    const res = await db.query(
        `DELETE FROM promos WHERE id=$1 RETURNING *`,
        [id]
    );
    return res.rows[0] || null;
};

export const publish = async (id) => {
    const res = await db.query(
        `UPDATE promos
         SET published = true,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
    );

    return res.rows[0];
};

export const unpublish = async (id) => {
    const res = await db.query(
        `UPDATE promos
         SET published = false,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
    );

    return res.rows[0];
};
