const express = require('express'); // hi
const router = express.Router({ mergeParams: true }); 
const db = require('../database/dbOperations');

router.get('/', async (req, res) => {
    const itineraryId = req.params.itineraryId; 
    try {
        const hotels = await db.fetchHotelsByItineraryId(itineraryId);
        res.json(hotels);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    const { itinerary_id, hotel_name, check_in_date, check_out_date, booking_reference, address } = req.body;
    try {
        const newHotel = await db.addHotel(itinerary_id, hotel_name, check_in_date, check_out_date, booking_reference, address);
        res.status(201).json(newHotel);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:hotelId', async (req, res) => {
    const { hotelId } = req.params;
    const { itinerary_id, hotel_name, check_in_date, check_out_date, booking_reference, address } = req.body;

    try {
        const updatedHotel = await db.updateHotel(hotelId, { itinerary_id, hotel_name, check_in_date, check_out_date, booking_reference, address });
        res.json(updatedHotel);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:hotelId', async (req, res) => {
    try {
        const deletedHotel = await db.deleteHotel(req.params.hotelId);
        res.json(deletedHotel);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
