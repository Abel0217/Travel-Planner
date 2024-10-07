const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations');
const firestoreDb = require('../firebaseAdmin'); 

// Fetch all activities for a specific itinerary
router.get('/', async (req, res) => {
    try {
        const activities = await db.fetchAllActivities(req.itineraryId);
        res.json(activities);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch activities by date range
router.get('/date-range', async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const activities = await db.fetchActivitiesByDateRange(req.itineraryId, startDate, endDate);
        res.json(activities);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new activity
router.post('/', async (req, res) => {
    const { title, description, location, activity_date, start_time, end_time, reservation_number } = req.body;
    try {
        const newActivity = await db.addActivity(
            req.itineraryId,
            title,
            description,
            location,
            activity_date,
            start_time,
            end_time,
            reservation_number
        );

        // Add to Firestore
        const activityRef = firestoreDb.collection('activities').doc(newActivity.activity_id.toString());
        await activityRef.set({
            itinerary_id: req.itineraryId,
            title,
            description,
            location,
            activity_date,
            start_time,
            end_time,
            reservation_number
        });

        res.status(201).json(newActivity);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update an existing activity
router.put('/:activityId', async (req, res) => {
    const { activityId } = req.params;
    const { title, description, location, activity_date, start_time, end_time, reservation_number } = req.body;
    try {
        const updatedActivity = await db.updateActivity(
            activityId,
            req.itineraryId,
            title,
            description,
            location,
            activity_date,
            start_time,
            end_time,
            reservation_number
        );

        // Update Firestore
        const activityRef = firestoreDb.collection('activities').doc(activityId);
        await activityRef.set({
            itinerary_id: req.itineraryId,
            title,
            description,
            location,
            activity_date,
            start_time,
            end_time,
            reservation_number
        });

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

        // Delete from Firestore
        const activityRef = firestoreDb.collection('activities').doc(activityId);
        await activityRef.delete();

        res.json(deletedActivity);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
