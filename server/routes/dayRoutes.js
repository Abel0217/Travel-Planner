const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations'); // Ensure this path is correct
const verifyToken = require('../FirebaseToken'); // Ensure this path is correct

// Apply the token verification middleware to all routes
router.use(verifyToken);

// Fetch ALL days for a specific itinerary
router.get('/:itineraryId/days', async (req, res) => {
    try {
        const owner_id = req.user.uid; // Firebase UID
        const { itineraryId } = req.params;
        const days = await db.fetchAllDays(itineraryId, owner_id);
        res.json(days);
    } catch (error) {
        console.error('Failed to fetch days:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Fetch a specific day by its ID
router.get('/:dayId', async (req, res) => {
    try {
        const owner_id = req.user.uid;  // Firebase UID
        const { dayId } = req.params;
        const day = await db.fetchDayById(dayId, owner_id);
        res.json(day);
    } catch (error) {
        console.error('Failed to fetch day:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Fetch day_id for a specific date within an itinerary
router.get('/:itineraryId/day_id', async (req, res) => {
    const { itineraryId } = req.params;
    const { date } = req.query;
    const owner_id = req.user.uid;  // Firebase UID

    try {
        const day = await db.fetchDayIdByDate(itineraryId, date, owner_id);
        res.json(day);
    } catch (error) {
        console.error('Failed to fetch day ID:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Create a new day
router.post('/', async (req, res) => {
    const { itinerary_id, date, summary, notes, weather } = req.body;
    const owner_id = req.user.uid;  // Firebase UID
    try {
        const newDay = await db.addDay({ itinerary_id, date, summary, notes, weather, owner_id });
        res.status(201).json(newDay);
    } catch (error) {
        console.error('Failed to create day:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Update an existing day
router.put('/:dayId', async (req, res) => {
    const { itinerary_id, date, summary, notes, weather } = req.body;
    const owner_id = req.user.uid;  // Firebase UID
    try {
        const updatedDay = await db.updateDay(req.params.dayId, owner_id, { itinerary_id, date, summary, notes, weather });
        res.json(updatedDay);
    } catch (error) {
        console.error('Failed to update day:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Delete a day
router.delete('/:dayId', async (req, res) => {
    const owner_id = req.user.uid;  // Firebase UID
    try {
        const deletedDay = await db.deleteDay(req.params.dayId, owner_id);
        res.json(deletedDay);
    } catch (error) {
        console.error('Failed to delete day:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

module.exports = router;
