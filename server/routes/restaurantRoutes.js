const express = require('express');
const router = express.Router({ mergeParams: true }); // Use mergeParams to access parent route params
const db = require('../database/dbOperations');
const firestoreDb = require('../firebaseAdmin'); 
const verifyToken = require('../FirebaseToken'); // Firebase token verification

// Apply token verification middleware to all restaurant routes
router.use(verifyToken);

// Fetch all restaurants for a specific itinerary
// Fetch all restaurants for a specific itinerary
router.get('/', async (req, res) => {
    const owner_id = req.user.uid;
    const itinerary_id = req.params.itineraryId;
    try {
        const restaurants = await db.fetchRestaurantsByItineraryId(itinerary_id, owner_id);
        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch restaurants by date range
router.get('/:itineraryId/date-range', async (req, res) => {
    const { startDate, endDate } = req.query;
    const owner_id = req.user.uid; // Firebase UID
    try {
        const restaurants = await db.fetchRestaurantsByDateRange(req.params.itineraryId, owner_id, startDate, endDate);
        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new restaurant
router.post('/', async (req, res) => {
    const { restaurant_name, reservation_date, reservation_time, guest_number, address, booking_confirmation } = req.body;
    const owner_id = req.user.uid;
    const itinerary_id = req.params.itineraryId;
    try {
        const newRestaurant = await db.addRestaurant(itinerary_id, owner_id, restaurant_name, reservation_date, reservation_time, guest_number, address, booking_confirmation);
        res.status(201).json(newRestaurant);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Update an existing restaurant
router.put('/:reservationId', async (req, res) => {
    const { reservationId } = req.params;
    const { restaurant_name, reservation_date, reservation_time, guest_number, address, booking_confirmation } = req.body;
    const owner_id = req.user.uid; 
    try {
        const updatedRestaurant = await db.updateRestaurant(
            reservationId,
            req.params.itineraryId,
            owner_id,
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
            itinerary_id: req.params.itineraryId,
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
    const owner_id = req.user.uid; // Firebase UID
    try {
        const deletedRestaurant = await db.deleteRestaurant(req.params.reservationId, owner_id);

        // Delete from Firestore
        const restaurantRef = firestoreDb.collection('restaurants').doc(req.params.reservationId);
        await restaurantRef.delete();

        res.json(deletedRestaurant);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
