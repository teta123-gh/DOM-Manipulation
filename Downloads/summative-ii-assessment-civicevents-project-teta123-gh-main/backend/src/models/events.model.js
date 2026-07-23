import db from '../config/db.js';

export const findAll = async () => {
    const { rows } = await db.query('SELECT * FROM events ORDER BY starts_at ASC');
    return rows;
};

export const findById = async (id) => {
    const { rows } = await db.query('SELECT * FROM events WHERE id = $1', [id]);
    return rows[0];
};

export const create = async ({ title, description, location, starts_at, ends_at, metadata }) => {
    const { rows } = await db.query(
        'INSERT INTO events (title, description, location, starts_at, ends_at, metadata) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [title, description, location, starts_at, ends_at, metadata]
    );
    return rows[0];
};

export const update = async (
    id,
    { title, description, location, starts_at, ends_at, metadata }
) => {
    const { rows } = await db.query(
        `UPDATE events 
       SET title=$1, 
           description=$2, 
           location=$3, 
           starts_at=$4, 
           ends_at=$5, 
           metadata=$6, 
           updated_at=NOW()
       WHERE id=$7 
       RETURNING *`,
        [title, description, location, starts_at, ends_at, metadata, id]
    );
    return rows[0];
};

export const remove = async (id) => {
    await db.query('DELETE FROM events WHERE id = $1', [id]);
};
