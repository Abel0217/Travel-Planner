const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations');

// Fetch all transports for a specific itinerary
router.get('/', async (req, res) => {
    try {
        const transports = await db.fetchAllTransports(req.itineraryId);
        res.json(transports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch transports for a specific day and itinerary
router.get('/day/:dayId', async (req, res) => {
    try {
        const transports = await db.fetchTransportsById(req.itineraryId, req.params.dayId);
        res.json(transports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new transport
router.post('/day/:dayId', async (req, res) => {
    const itineraryId = req.itineraryId;  
    const dayId = req.params.dayId; 
    const {
        type, 
        pickupTime, 
        dropoffTime, 
        pickupLocation, 
        dropoffLocation, 
        bookingReference 
    } = req.body;

    try {
        const newTransport = await db.addTransport(
            req.itineraryId,
            req.params.dayId,
            type,
            pickupTime,
            dropoffTime,
            pickupLocation,
            dropoffLocation,
            bookingReference
        );
        res.status(201).json(newTransport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update an existing transport
router.put('/:transportId', async (req, res) => {
    const { transportId } = req.params;
    const { itineraryId, dayId } = req;
    const { type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference } = req.body;
    try {
        const updatedTransport = await db.updateTransport(transportId, itineraryId, dayId, type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference);
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
        res.json(deletedTransport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
