const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations');
const firestoreDb = require('../firebaseAdmin'); 

// Fetch all transports for a specific itinerary
router.get('/', async (req, res) => {
    try {
        const transports = await db.fetchTransportsByItineraryId(req.itineraryId);
        res.json(transports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch transports by date range
router.get('/date-range', async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const transports = await db.fetchTransportsByDateRange(req.itineraryId, startDate, endDate);
        res.json(transports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new transport
router.post('/', async (req, res) => {
    const { type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference } = req.body;
    try {
        const newTransport = await db.addTransport(
            req.itineraryId,
            type,
            pickup_time,
            dropoff_time,
            pickup_location,
            dropoff_location,
            booking_reference
        );

        // Add to Firestore
        const transportRef = firestoreDb.collection('transports').doc(newTransport.transport_id.toString());
        await transportRef.set({
            itinerary_id: req.itineraryId,
            type,
            pickup_time,
            dropoff_time,
            pickup_location,
            dropoff_location,
            booking_reference
        });

        res.status(201).json(newTransport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update an existing transport
router.put('/:transportId', async (req, res) => {
    const { transportId } = req.params;
    const { type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference } = req.body;
    try {
        const updatedTransport = await db.updateTransport(
            transportId,
            req.itineraryId,
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
            itinerary_id: req.itineraryId,
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
    try {
        const deletedTransport = await db.deleteTransport(transportId);

        // Delete from Firestore
        const transportRef = firestoreDb.collection('transports').doc(transportId);
        await transportRef.delete();

        res.json(deletedTransport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
