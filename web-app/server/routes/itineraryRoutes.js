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

// Fetch all details for each day of an itinerary
router.get('/:itineraryId/days/details', async (req, res) => {
    try {
        const { itineraryId } = req.params;
        const days = await db.fetchDaysByItineraryId(itineraryId);

        const daysWithDetails = await Promise.all(days.map(async (day) => {
            const activities = await db.fetchActivitiesByDayId(day.day_id);
            const flights = await db.fetchFlightsByDayId(day.day_id);
            const hotels = await db.fetchHotelsByDayId(day.day_id);
            const restaurants = await db.fetchRestaurantsByDayId(day.day_id);
            const transport = await db.fetchTransportByDayId(day.day_id);

            return {
                ...day,
                activities,
                flights,
                hotels,
                restaurants,
                transport,
            };
        }));

        res.json(daysWithDetails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new itinerary
router.post('/', async (req, res) => {
    const { title, start_date, end_date } = req.body;

    try {
        console.log('Creating itinerary with data:', { title, start_date, end_date });

        // Validate the required fields
        if (!title || !start_date || !end_date) {
            console.log('Validation failed: Missing required fields');
            return res.status(400).json({ error: 'Title, start date, and end date are required' });
        }

        // Create the itinerary
        const newItinerary = await db.addItinerary({ title, start_date, end_date });
        console.log('New itinerary created:', newItinerary);

        res.status(201).json(newItinerary);
    } catch (error) {
        console.error('Failed to create itinerary:', error);
        res.status(500).json({ error: 'Internal server error' });
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
