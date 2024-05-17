const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations'); // Ensure correct path to dbOperations

// Fetch all restaurants for a specific itinerary
router.get('/', async (req, res) => {
    try {
        const restaurants = await db.fetchAllRestaurants(req.itineraryId);
        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch restaurants for a specific day and itinerary
router.get('/day/:dayId', async (req, res) => {
    try {
        const restaurants = await db.fetchRestaurantsById(req.itineraryId, req.params.dayId);
        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new restaurant
router.post('/day/:dayId', async (req, res) => {
    const itineraryId = req.itineraryId;  // From middleware
    const dayId = req.params.dayId;  // Correctly using params to fetch dayId
    const { restaurantName, reservationDate, reservationTime, guestNumber, address, bookingConfirmation } = req.body;

    try {
        const newRestaurant = await db.addRestaurant(
            itineraryId,
            dayId,
            restaurantName,
            reservationDate,
            reservationTime,
            guestNumber,
            address,
            bookingConfirmation
        );
        res.status(201).json(newRestaurant);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



// Update an existing restaurant
router.put('/:reservationId', async (req, res) => {
    const { reservationId } = req.params;
    const { itineraryId, dayId } = req;
    const { restaurantName, reservationDate, reservationTime, guestNumber, address, bookingConfirmation } = req.body;
    try {
        const updatedRestaurant = await db.updateRestaurant(reservationId, itineraryId, dayId, restaurantName, reservationDate, reservationTime, guestNumber, address, bookingConfirmation);
        res.json(updatedRestaurant);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a restaurant
router.delete('/:reservationId', async (req, res) => {
    const { reservationId } = req.params;
    try {
        const deletedRestaurant = await db.deleteRestaurant(reservationId);
        res.json(deletedRestaurant);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
