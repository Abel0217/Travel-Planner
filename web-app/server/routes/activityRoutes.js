const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations');

// Fetch all activities for a specific day and itinerary
router.get('/', async (req, res) => {
    try {
        const activities = await db.fetchAllActivities(req.itineraryId);
        res.json(activities);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch activities for a specific day and itinerary
router.get('/day/:dayId', async (req, res) => {
    try {
        const activities = await db.fetchActivitiesById(req.itineraryId, req.params.dayId);
        res.json(activities);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new activity
router.post('/day/:dayId', async (req, res) => {
    // Using `req.params` to ensure both `itineraryId` and `dayId` are captured correctly
    const { itineraryId } = req;
    const { dayId } = req.params;
    const { title, description, location, activity_date, start_time, end_time, created_at, reservation_number } = req.body;

    try {
        const newActivity = await db.addActivity(itineraryId, dayId, title, description, location, activity_date, start_time, end_time, created_at, reservation_number);
        res.status(201).json(newActivity);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update an existing activity
router.put('/:activityId', async (req, res) => {
    const { activityId } = req.params;
    const { itineraryId, dayId } = req;
    const { title, description, location, activity_date, start_time, end_time, created_at, reservation_number } = req.body;
    try {
        const updatedActivity = await db.updateActivity(activityId, itineraryId, dayId, title, description, location, activity_date, start_time, end_time, created_at, reservation_number);
        res.json(updatedActivity);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete an activity
router.delete('/:activityId', async (req, res) => {
    const { activityId } = req.params;
    try {
        const deletedActivity = await db.deleteActivity(activityId);
        res.json(deletedActivity);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
