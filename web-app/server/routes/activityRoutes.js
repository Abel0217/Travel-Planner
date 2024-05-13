const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations');

// Fetch all activities for a specific day
router.get('/', async (req, res) => {
    try {
        const activities = await db.fetchActivitiesByDayId(req.dayId); // req.dayId is passed through middleware
        res.json(activities);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new activity
router.post('/', async (req, res) => {
    const { itinerary_id, day_id, title, description, location, activity_date, start_time, end_time, created_at, reservation_number } = req.body;
    try {
        const newActivity = await db.addActivity(itinerary_id, day_id, title, description, location, activity_date, start_time, end_time, created_at, reservation_number);
        res.status(201).json(newActivity);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update an existing activity
router.put('/:activityId', async (req, res) => {
    const { activityId } = req.params;
    const { itinerary_id, day_id, title, description, location, activity_date, start_time, end_time, created_at, reservation_number } = req.body;
    try {
        const updatedActivity = await db.updateActivity(activityId, itinerary_id, day_id, title, description, location, activity_date, start_time, end_time, created_at, reservation_number);
        res.json(updatedActivity);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete an activity
router.delete('/:activityId', async (req, res) => {
    try {
        const deletedActivity = await db.deleteActivity(req.params.activityId);
        res.json(deletedActivity);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
