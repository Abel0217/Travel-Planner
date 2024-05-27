// May not need anymore -- pending...
const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations');

// Fetch ALL days
router.get('/', async (req, res) => {
    try {
        const days = await db.fetchAllDays();
        res.json(days);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch a specific day
router.get('/:dayId', async (req, res) => {
    try {
        const day = await db.fetchDayById(req.params.dayId);
        res.json(day);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch day_id for a specific date within an itinerary
router.get('/:itineraryId/day_id', async (req, res) => {
    const { itineraryId } = req.params;
    const { date } = req.query;

    try {
        const day = await db.fetchDayIdByDate(itineraryId, date);
        res.json(day);
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
            const flights = await db.fetchFlightsByItineraryId(itineraryId);
            const hotels = await db.fetchHotelsByItineraryId(itineraryId);
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

// Create a new day
router.post('/', async (req, res) => {
    const { itinerary_id, date, summary, notes, weather } = req.body;
    try {
        const newDay = await db.addDay({ itinerary_id, date, summary, notes, weather });
        res.status(201).json(newDay);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update an existing day
router.put('/:dayId', async (req, res) => {
    const { itinerary_id, date, summary, notes, weather } = req.body;
    try {
        const updatedDay = await db.updateDay(req.params.dayId, { itinerary_id, date, summary, notes, weather });
        res.json(updatedDay);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a day
router.delete('/:dayId', async (req, res) => {
    try {
        const deletedDay = await db.deleteDay(req.params.dayId);
        res.json(deletedDay);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
