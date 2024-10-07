const express = require('express');
const router = express.Router();
const moment = require('moment');
const pool = require('../database/dbOperations'); // Ensure you adjust the path based on your structure

// Fetch upcoming notifications
router.get('/', async (req, res) => {
    const userId = req.user.id; // Adjust this to fetch the current logged-in user's ID

    const today = moment().startOf('day');
    const fourteenDaysFromNow = moment().add(14, 'days').startOf('day');

    try {
        // Query to fetch upcoming events
        const query = `
            SELECT * FROM core.itineraries 
            WHERE owner_id = $1 AND start_date BETWEEN $2 AND $3
            UNION
            SELECT * FROM core.flights 
            WHERE user_id = $1 AND departure_date BETWEEN $2 AND $3
            UNION
            SELECT * FROM core.restaurants 
            WHERE user_id = $1 AND reservation_date BETWEEN $2 AND $3
            UNION
            SELECT * FROM core.transport 
            WHERE user_id = $1 AND pickup_date BETWEEN $2 AND $3
        `;

        const values = [userId, today.format('YYYY-MM-DD'), fourteenDaysFromNow.format('YYYY-MM-DD')];

        const { rows } = await pool.query(query, values);

        // Format and send the notifications
        const notifications = rows.map((row) => {
            return {
                title: row.title || row.destination || row.restaurant_name || 'Upcoming Event',
                message: `Your ${row.title || row.destination || row.restaurant_name} starts on ${row.start_date || row.departure_date || row.reservation_date}`,
                date: row.start_date || row.departure_date || row.reservation_date,
            };
        });

        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

module.exports = router;
