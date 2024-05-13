const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations'); // Ensure you have this module

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
