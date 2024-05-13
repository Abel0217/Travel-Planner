const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations');

router.get('/', async (req, res) => {
    const itineraryId = req.itineraryId; 
    const flights = await db.fetchFlightsByItineraryId(itineraryId);
    res.json(flights);
});

router.post('/', async (req, res) => {
    const { itinerary_id, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference } = req.body;
    try {
        const newFlight = await db.addFlight(itinerary_id, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference);
        res.status(201).json(newFlight);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:flightId', async (req, res) => {
    const { itinerary_id, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference } = req.body;
    const { flightId } = req.params;

    try {
        const updatedFlight = await db.updateFlight(flightId, { itinerary_id, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference });
        res.json(updatedFlight);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:flightId', async (req, res) => {
    try {
        const deletedFlight = await db.deleteFlight(req.params.flightId);
        res.json(deletedFlight);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
