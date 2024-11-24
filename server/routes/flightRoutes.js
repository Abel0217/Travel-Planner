const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../database/dbOperations');
const verifyToken = require('../FirebaseToken'); 

// Apply the token verification middleware to all routes
router.use(verifyToken);

// Fetch all flights for a specific itinerary
router.get('/', async (req, res) => {
    try {
        const owner_id = req.user.uid; // Firebase UID
        const itinerary_id = req.params.itineraryId; // Access inherited params
        console.log("Flight handler params:", { itinerary_id, owner_id });

        // Fetch flights from the database
        const flights = await db.fetchFlightsByItineraryId(itinerary_id, owner_id);
        res.json(flights);
    } catch (error) {
        console.error('Failed to fetch flights:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});


// Fetch flights by date range
router.get('/:itineraryId/date-range', async (req, res) => {
    const { startDate, endDate } = req.query;
    const owner_id = req.user.uid;  // Firebase UID
    try {
        const { itineraryId } = req.params;
        const flights = await db.fetchFlightsByDateRange(itineraryId, owner_id, startDate, endDate);
        res.json(flights);
    } catch (error) {
        console.error('Failed to fetch flights by date range:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Add a new flight
router.post('/', async (req, res) => {
    const { itinerary_id, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference, passenger_name, seat_number } = req.body;
    const owner_id = req.user.uid;  // Firebase UID for the logged-in user
    try {
        const newFlight = await db.addFlight(
            itinerary_id,
            owner_id,  // Ensuring the flight is linked to the correct user
            airline,
            flight_number,
            departure_airport,
            arrival_airport,
            departure_time,
            arrival_time,
            booking_reference,
            passenger_name,
            seat_number
        );
        res.status(201).json(newFlight);
    } catch (error) {
        console.error('Failed to add flight:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Update an existing flight
router.put('/:flightId', async (req, res) => {
    const { flightId } = req.params;
    const { itinerary_id, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference } = req.body;
    const owner_id = req.user.uid;  
    try {
        const updatedFlight = await db.updateFlight(
            flightId,
            itinerary_id,
            owner_id,
            airline,
            flight_number,
            departure_airport,
            arrival_airport,
            departure_time,
            arrival_time,
            booking_reference
        );
        res.json(updatedFlight);
    } catch (error) {
        console.error('Failed to update flight:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Delete a flight
router.delete('/:flightId', async (req, res) => {
    const { flightId } = req.params;
    const owner_id = req.user.uid;  // Firebase UID
    try {
        const deletedFlight = await db.deleteFlight(flightId, owner_id);
        res.json(deletedFlight);
    } catch (error) {
        console.error('Failed to delete flight:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

module.exports = router;
