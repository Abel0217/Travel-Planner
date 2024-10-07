const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations');
const firestoreDb = require('../firebaseAdmin'); // Correct import

// Fetch all restaurants for a specific itinerary
router.get('/', async (req, res) => {
    try {
        const restaurants = await db.fetchRestaurantsByItineraryId(req.itineraryId);
        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch restaurants by date range
router.get('/date-range', async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const restaurants = await db.fetchRestaurantsByDateRange(req.itineraryId, startDate, endDate);
        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new restaurant
router.post('/', async (req, res) => {
    const { restaurant_name, reservation_date, reservation_time, guest_number, address, booking_confirmation } = req.body;
    try {
        const newRestaurant = await db.addRestaurant(
            req.itineraryId,
            restaurant_name,
            reservation_date,
            reservation_time,
            guest_number,
            address,
            booking_confirmation
        );

        // Add to Firestore
        const restaurantRef = firestoreDb.collection('restaurants').doc(newRestaurant.reservation_id.toString());
        await restaurantRef.set({
            itinerary_id: req.itineraryId,
            restaurant_name,
            reservation_date,
            reservation_time,
            guest_number,
            address,
            booking_confirmation
        });

        res.status(201).json(newRestaurant);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update an existing restaurant
router.put('/:reservationId', async (req, res) => {
    const { reservationId } = req.params;
    const { restaurant_name, reservation_date, reservation_time, guest_number, address, booking_confirmation } = req.body;
    try {
        const updatedRestaurant = await db.updateRestaurant(
            reservationId,
            req.itineraryId,
            restaurant_name,
            reservation_date,
            reservation_time,
            guest_number,
            address,
            booking_confirmation
        );

        // Update Firestore
        const restaurantRef = firestoreDb.collection('restaurants').doc(reservationId);
        await restaurantRef.set({
            itinerary_id: req.itineraryId,
            restaurant_name,
            reservation_date,
            reservation_time,
            guest_number,
            address,
            booking_confirmation
        });

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

        // Delete from Firestore
        const restaurantRef = firestoreDb.collection('restaurants').doc(reservationId);
        await restaurantRef.delete();

        res.json(deletedRestaurant);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
