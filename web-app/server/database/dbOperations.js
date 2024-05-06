const pool = require('./db');  // Ensure this correctly points to your configured database pool

// Fetch all itineraries
const fetchAllItineraries = async () => {
    const query = 'SELECT * FROM core.itineraries';
    try {
        const { rows } = await pool.query(query);
        return rows;
    } catch (error) {
        console.error("Error executing fetchAllItineraries query:", error.message);
        throw error;
    }
};

// Add a new itinerary
const addItinerary = async (title, description, start_date, end_date, owner_id) => {
    const query = 'INSERT INTO core.itineraries (title, description, start_date, end_date, owner_id) VALUES ($1, $2, $3, $4, $5) RETURNING *';
    const values = [title, description, start_date, end_date, owner_id];
    try {
        const { rows } = await pool.query(query, values);
        return rows[0];
    } catch (error) {
        console.error("Error executing addItinerary query:", error.message);
        throw error;
    }
};

// Update an existing itinerary
const updateItinerary = async (itinerary_id, title, description, start_date, end_date, owner_id) => {
    const query = 'UPDATE core.itineraries SET title = $1, description = $2, start_date = $3, end_date = $4, owner_id = $5 WHERE itinerary_id = $6 RETURNING *';
    const values = [title, description, start_date, end_date, owner_id, itinerary_id];
    try {
        const { rows } = await pool.query(query, values);
        return rows[0];
    } catch (error) {
        console.error("Error executing updateItinerary query:", error.message);
        throw error;
    }
};

// Delete an itinerary
const deleteItinerary = async (itinerary_id) => {
    const query = 'DELETE FROM core.itineraries WHERE itinerary_id = $1 RETURNING *';
    const values = [itinerary_id];
    try {
        const { rows } = await pool.query(query, values);
        return rows[0];
    } catch (error) {
        console.error("Error executing deleteItinerary query:", error.message);
        throw error;
    }
};

module.exports = {
    fetchAllItineraries,
    addItinerary,
    updateItinerary,
    deleteItinerary
};
