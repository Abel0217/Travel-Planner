const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations');
const firestoreDb = require('../firebaseAdmin'); 

// Fetch all flights for a specific itinerary
router.get('/', async (req, res) => {
    try {
        const flights = await db.fetchFlightsByItineraryId(req.itineraryId);
        res.json(flights);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch flights by date range
router.get('/date-range', async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const flights = await db.fetchFlightsByDateRange(req.itineraryId, startDate, endDate);
        res.json(flights);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new flight
router.post('/', async (req, res) => {
    const { airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference } = req.body;
    try {
        const newFlight = await db.addFlight(
            req.itineraryId,
            airline,
            flight_number,
            departure_airport,
            arrival_airport,
            departure_time,
            arrival_time,
            booking_reference
        );

        // Add to Firestore
        const flightRef = firestoreDb.collection('flights').doc(newFlight.flight_id.toString());
        await flightRef.set({
            itinerary_id: req.itineraryId,
            airline,
            flight_number,
            departure_airport,
            arrival_airport,
            departure_time,
            arrival_time,
            booking_reference
        });

        res.status(201).json(newFlight);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update an existing flight
router.put('/:flightId', async (req, res) => {
    const { flightId } = req.params;
    const { airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference } = req.body;
    try {
        const updatedFlight = await db.updateFlight(
            flightId,
            req.itineraryId,
            airline,
            flight_number,
            departure_airport,
            arrival_airport,
            departure_time,
            arrival_time,
            booking_reference
        );

        // Update Firestore
        const flightRef = firestoreDb.collection('flights').doc(flightId);
        await flightRef.set({
            itinerary_id: req.itineraryId,
            airline,
            flight_number,
            departure_airport,
            arrival_airport,
            departure_time,
            arrival_time,
            booking_reference
        });

        res.json(updatedFlight);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a flight
router.delete('/:flightId', async (req, res) => {
    const { flightId } = req.params;
    try {
        const deletedFlight = await db.deleteFlight(flightId);

        // Delete from Firestore
        const flightRef = firestoreDb.collection('flights').doc(flightId);
        await flightRef.delete();

        res.json(deletedFlight);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
