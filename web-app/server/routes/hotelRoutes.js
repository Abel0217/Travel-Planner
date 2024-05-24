const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations');

// Fetch all hotels for a specific itinerary
router.get('/', async (req, res) => {
    try {
        const hotels = await db.fetchHotelsByItineraryId(req.itineraryId);
        res.json(hotels);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch hotels by date range
router.get('/date-range', async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const hotels = await db.fetchHotelsByDateRange(req.itineraryId, startDate, endDate);
        res.json(hotels);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new hotel
router.post('/', async (req, res) => {
    const { hotel_name, check_in_date, check_out_date, address, booking_confirmation } = req.body;
    try {
        const newHotel = await db.addHotel(
            req.itineraryId,
            hotel_name,
            check_in_date,
            check_out_date,
            address,
            booking_confirmation
        );
        res.status(201).json(newHotel);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update an existing hotel
router.put('/:hotelId', async (req, res) => {
    const { hotelId } = req.params;
    const { hotel_name, check_in_date, check_out_date, address, booking_confirmation } = req.body;
    try {
        const updatedHotel = await db.updateHotel(
            hotelId,
            req.itineraryId,
            hotel_name,
            check_in_date,
            check_out_date,
            address,
            booking_confirmation
        );
        res.json(updatedHotel);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a hotel
router.delete('/:hotelId', async (req, res) => {
    const { hotelId } = req.params;
    try {
        const deletedHotel = await db.deleteHotel(hotelId);
        res.json(deletedHotel);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
