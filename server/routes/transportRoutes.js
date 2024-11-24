const express = require('express');
const router = express.Router({ mergeParams: true }); // Use mergeParams to access parent route params
const db = require('../database/dbOperations');
const firestoreDb = require('../firebaseAdmin');
const verifyToken = require('../FirebaseToken'); // Firebase token verification

// Apply token verification middleware to all transport routes
router.use(verifyToken);

// Fetch all transports for a specific itinerary
router.get('/', async (req, res) => {
    const owner_id = req.user.uid; // Firebase UID
    const itinerary_id = req.params.itineraryId;
    try {
        const transports = await db.fetchTransportsByItineraryId(itinerary_id, owner_id);
        res.json(transports);
    } catch (error) {
        console.error('Failed to fetch transports:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Fetch transports by date range
router.get('/date-range', async (req, res) => {
    const { startDate, endDate } = req.query;
    const owner_id = req.user.uid; // Firebase UID
    try {
        const transports = await db.fetchTransportsByDateRange(req.params.itineraryId, owner_id, startDate, endDate);
        res.json(transports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new transport
router.post('/', async (req, res) => {
    const { type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference } = req.body;
    const owner_id = req.user.uid;
    const itinerary_id = req.params.itineraryId;
    try {
        const newTransport = await db.addTransport(
            itinerary_id,
            owner_id,
            type,
            pickup_time,
            dropoff_time,
            pickup_location,
            dropoff_location,
            booking_reference
        );
        res.status(201).json(newTransport);
    } catch (error) {
        console.error('Failed to add transport:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Update an existing transport
router.put('/:transportId', async (req, res) => {
    const { transportId } = req.params;
    const { type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference } = req.body;
    const owner_id = req.user.uid; // Firebase UID
    try {
        const updatedTransport = await db.updateTransport(
            transportId,
            req.params.itineraryId,
            owner_id,
            type,
            pickup_time,
            dropoff_time,
            pickup_location,
            dropoff_location,
            booking_reference
        );

        // Update Firestore
        const transportRef = firestoreDb.collection('transports').doc(transportId);
        await transportRef.set({
            itinerary_id: req.params.itineraryId,
            type,
            pickup_time,
            dropoff_time,
            pickup_location,
            dropoff_location,
            booking_reference
        });

        res.json(updatedTransport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a transport
router.delete('/:transportId', async (req, res) => {
    const { transportId } = req.params;
    const owner_id = req.user.uid; // Firebase UID
    try {
        const deletedTransport = await db.deleteTransport(transportId, owner_id);

        // Delete from Firestore
        const transportRef = firestoreDb.collection('transports').doc(transportId);
        await transportRef.delete();

        res.json(deletedTransport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
