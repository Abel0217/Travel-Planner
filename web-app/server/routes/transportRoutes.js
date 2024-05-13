const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations');

// Fetch all transports for a specific day
router.get('/', async (req, res) => {
    try {
        const transports = await db.fetchTransportsByDayId(req.dayId); // req.dayId is passed through middleware
        res.json(transports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new transport entry
router.post('/', async (req, res) => {
    const { itinerary_id, day_id, type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference } = req.body;
    try {
        const newTransport = await db.addTransport(itinerary_id, day_id, type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference);
        res.status(201).json(newTransport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update an existing transport entry
router.put('/:transportId', async (req, res) => {
    const { transportId } = req.params;
    const { itinerary_id, day_id, type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference } = req.body;
    try {
        const updatedTransport = await db.updateTransport(transportId, itinerary_id, day_id, type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference);
        res.json(updatedTransport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a transport entry
router.delete('/:transportId', async (req, res) => {
    try {
        const deletedTransport = await db.deleteTransport(req.params.transportId);
        res.json(deletedTransport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
