const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../database/dbOperations');
const verifyToken = require('../FirebaseToken'); // Import the Firebase token middleware

// Apply the token verification middleware to all routes
router.use(verifyToken);

// Fetch all activities for a specific itinerary
router.get('/', async (req, res) => {
    const owner_id = req.user.uid;
    const itinerary_id = req.params.itineraryId; // This should now be accessible
    console.log("Activity handler params with mergeParams:", { itinerary_id, owner_id });

    try {
        const activities = await db.fetchAllActivities(itinerary_id, owner_id);
        res.json(activities);
    } catch (error) {
        console.error('Failed to fetch activities:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Fetch activities by date range
router.get('/:itineraryId/date-range', async (req, res) => {
    const { startDate, endDate } = req.query;
    const owner_id = req.user.uid; // Firebase UID
    const { itineraryId } = req.params;
    try {
        const activities = await db.fetchActivitiesByDateRange(itineraryId, owner_id, startDate, endDate);
        res.json(activities);
    } catch (error) {
        console.error('Failed to fetch activities by date range:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Add a new activity
router.post('/', async (req, res) => {
    const { title, description, location, activity_date, start_time, end_time, reservation_number } = req.body;
    const owner_id = req.user.uid; // Firebase UID
    const itinerary_id = req.params.itineraryId; // Access itinerary ID from URL params

    try {
        const newActivity = await db.addActivity(
            itinerary_id,  // Pass the itinerary ID here
            owner_id,
            title,
            description,
            location,
            activity_date,
            start_time,
            end_time,
            reservation_number
        );
        res.status(201).json(newActivity);
    } catch (error) {
        console.error('Failed to add activity:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Update an existing activity
router.put('/:activityId', async (req, res) => {
    const { activityId } = req.params;
    const { title, description, location, activity_date, start_time, end_time, reservation_number, itineraryId } = req.body;
    const owner_id = req.user.uid; // Firebase UID
    try {
        const updatedActivity = await db.updateActivity(
            activityId, 
            itineraryId, 
            owner_id, 
            title, 
            description, 
            location, 
            activity_date, 
            start_time, 
            end_time, 
            reservation_number
        );
        res.json(updatedActivity);
    } catch (error) {
        console.error('Failed to update activity:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Delete an activity
router.delete('/:activityId', async (req, res) => {
    const { activityId } = req.params;
    const owner_id = req.user.uid; // Firebase UID
    try {
        const deletedActivity = await db.deleteActivity(activityId, owner_id);
        res.json(deletedActivity);
    } catch (error) {
        console.error('Failed to delete activity:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

module.exports = router;
