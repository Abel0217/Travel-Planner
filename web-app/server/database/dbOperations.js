// dbOperations.js
const pool = require('./db');  // Make sure this points to the file where the Pool is configured.

const fetchAllItineraries = async (owner_id = null) => {
    let query = 'SELECT * FROM core.itineraries';
    let values = [];
    if (owner_id) {
        query += ' WHERE owner_id = $1';
        values.push(owner_id);
    }
    const { rows } = await pool.query(query, values);
    return rows;
};

const addItinerary = async (title, description, start_date, end_date, owner_id) => {
    const query = 'INSERT INTO core.itineraries (title, description, start_date, end_date, owner_id) VALUES ($1, $2, $3, $4, $5) RETURNING *';
    const values = [title, description, start_date, end_date, owner_id];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

const updateItinerary = async (itinerary_id, title, description, start_date, end_date, owner_id) => {
    const query = 'UPDATE core.itineraries SET title = $1, description = $2, start_date = $3, end_date = $4, owner_id = $5 WHERE itinerary_id = $6 RETURNING *';
    const values = [title, description, start_date, end_date, owner_id, itinerary_id];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

const deleteItinerary = async (itinerary_id) => {
    const query = 'DELETE FROM core.itineraries WHERE itinerary_id = $1 RETURNING *';
    const values = [itinerary_id];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

module.exports = {
    fetchAllItineraries,
    addItinerary,
    updateItinerary,
    deleteItinerary, 
};
