const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations');

// Fetch ALL itineraries
router.get('/', async (req, res) => {
    try {
        const itineraries = await db.fetchAllItineraries();
        res.json(itineraries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch a specific itinerary
router.get('/:itineraryId', async (req, res) => {
    try {
        const itinerary = await db.fetchItineraryById(req.params.itineraryId);
        res.json(itinerary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new itinerary
router.post('/', async (req, res) => {
    try {
        const newItinerary = await db.addItinerary(req.body);
        res.status(201).json(newItinerary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update an existing itinerary
router.put('/:itineraryId', async (req, res) => {
    try {
        const updatedItinerary = await db.updateItinerary(req.params.itineraryId, req.body);
        res.json(updatedItinerary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete an itinerary
router.delete('/:itineraryId', async (req, res) => {
    try {
        const deletedItinerary = await db.deleteItinerary(req.params.itineraryId);
        res.json(deletedItinerary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
