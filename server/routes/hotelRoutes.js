const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../database/dbOperations');
const firestoreDb = require('../firebaseAdmin'); 
const verifyToken = require('../FirebaseToken'); // Firebase token verification

// Apply token verification middleware to all hotel routes
router.use(verifyToken);

// Fetch all hotels for a specific itinerary
router.get('/', async (req, res) => {
    try {
        const owner_id = req.user.uid;
        const itinerary_id = req.params.itineraryId; // Access inherited params
        console.log("Hotel handler params:", { itinerary_id, owner_id });

        const hotels = await db.fetchHotelsByItineraryId(itinerary_id, owner_id);
        res.json(hotels);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch hotels by date range
router.get('/date-range', async (req, res) => {
    const { startDate, endDate } = req.query;
    const owner_id = req.user.uid;  // Firebase UID
    try {
        const hotels = await db.fetchHotelsByDateRange(req.params.itineraryId, owner_id, startDate, endDate);
        res.json(hotels);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new hotel
router.post('/', async (req, res) => {
    const { hotel_name, check_in_date, check_out_date, address, booking_confirmation } = req.body;
    const owner_id = req.user.uid;  // Firebase UID
    try {
        // Add hotel to PostgreSQL database only
        const newHotel = await db.addHotel(
            req.params.itineraryId,
            owner_id,
            hotel_name,
            check_in_date,
            check_out_date,
            address,
            booking_confirmation
        );

        res.status(201).json(newHotel);
    } catch (error) {
        console.error('Error adding hotel:', error);
        res.status(500).json({ error: error.message });
    }
});


// Update an existing hotel
router.put('/:hotelId', async (req, res) => {
    const { hotel_name, check_in_date, check_out_date, address, booking_confirmation } = req.body;
    const owner_id = req.user.uid;  // Firebase UID
    try {
        const updatedHotel = await db.updateHotel(
            req.params.hotelId,
            req.params.itineraryId,
            owner_id,
            hotel_name,
            check_in_date,
            check_out_date,
            address,
            booking_confirmation
        );

        // Update Firestore
        const hotelRef = firestoreDb.collection('hotels').doc(req.params.hotelId);
        await hotelRef.set({
            itinerary_id: req.params.itineraryId,
            hotel_name,
            check_in_date,
            check_out_date,
            address,
            booking_confirmation
        });

        res.json(updatedHotel);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a hotel
router.delete('/:hotelId', async (req, res) => {
    const owner_id = req.user.uid;  // Firebase UID
    try {
        const deletedHotel = await db.deleteHotel(req.params.hotelId, owner_id);

        // Delete from Firestore
        const hotelRef = firestoreDb.collection('hotels').doc(req.params.hotelId);
        await hotelRef.delete();

        res.json(deletedHotel);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
