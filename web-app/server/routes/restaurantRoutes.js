const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations');

// Fetch all restaurants for a specific day
router.get('/', async (req, res) => {
    try {
        const restaurants = await db.fetchRestaurantsByDayId(req.dayId); // req.dayId is passed through middleware
        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new restaurant entry
router.post('/', async (req, res) => {
    const { day_id, restaurant_name, reservation_time, reservation_number, address, reservation_date } = req.body;
    try {
        const newRestaurant = await db.addRestaurant(day_id, restaurant_name, reservation_time, reservation_number, address, reservation_date);
        res.status(201).json(newRestaurant);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update an existing restaurant entry
router.put('/:reservationId', async (req, res) => {
    const { reservationId } = req.params;
    const { day_id, restaurant_name, reservation_time, reservation_number, address, reservation_date } = req.body;
    try {
        const updatedRestaurant = await db.updateRestaurant(reservationId, day_id, restaurant_name, reservation_time, reservation_number, address, reservation_date);
        res.json(updatedRestaurant);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a restaurant entry
router.delete('/:reservationId', async (req, res) => {
    try {
        const deletedRestaurant = await db.deleteRestaurant(req.params.reservationId);
        res.json(deletedRestaurant);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
