const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations');
const verifyToken = require('../FirebaseToken'); // Import the Firebase token middleware
const pool = require('../database/db');
const { ensureDestinationChat, parseDestination } = require('../database/aiChats');
const { notifyTripInvite } = require('../services/tripMail');

// Apply the token verification middleware to all routes
router.use(verifyToken);

// Fetch ALL itineraries for the logged-in user
router.get('/', async (req, res) => {
    try {
        const owner_id = req.user.uid; // Ensure uid is available
        console.log('Owner ID from request:', owner_id); // Log the owner ID
        const itineraries = await db.fetchAllItineraries(owner_id);
        console.log('Fetched itineraries:', itineraries); // Log fetched itineraries
        res.json(itineraries);
    } catch (error) {
        console.error('Failed to fetch itineraries:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Fetch a specific itinerary (for owner or guest)
router.get('/:itineraryId', verifyToken, async (req, res) => {
    const { itineraryId } = req.params;
    const userId = req.user.uid;

    try {
        console.log('Attempting to fetch itinerary with ID:', itineraryId, 'for user ID:', userId);

        let itinerary = await db.fetchItineraryById(itineraryId, userId);

        if (!itinerary) {
            console.log('User is not the owner, checking shared access for itinerary:', itineraryId);

            const isGuestQuery = `
                SELECT i.*
                FROM core.itineraries i
                JOIN core.shared s ON i.itinerary_id = s.itinerary_id
                WHERE i.itinerary_id = $1 AND s.guest_id = $2;
            `;
            const result = await pool.query(isGuestQuery, [itineraryId, userId]);

            if (result.rows.length > 0) {
                itinerary = result.rows[0];
            } else {
                console.log('Access denied for user ID:', userId, 'on itinerary ID:', itineraryId);
                return res.status(403).json({ error: 'Access denied.' });
            }
        }

        console.log('Fetched itinerary:', itinerary);
        res.json(itinerary);
    } catch (error) {
        console.error('Failed to fetch the itinerary:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Fetch all details for each day of an itinerary
router.get('/:itineraryId/days/details', async (req, res) => {
    try {
        const { itineraryId } = req.params;
        const days = await db.fetchDaysByItineraryId(itineraryId);

        const daysWithDetails = await Promise.all(days.map(async (day) => {
            const activities = await db.fetchActivitiesByDayId(day.day_id);
            const flights = await db.fetchFlightsByDayId(day.day_id);
            const hotels = await db.fetchHotelsByDayId(day.day_id);
            const restaurants = await db.fetchRestaurantsByDayId(day.day_id);
            const transport = await db.fetchTransportByDayId(day.day_id);

            return {
                ...day,
                activities,
                flights,
                hotels,
                restaurants,
                transport,
            };
        }));

        res.json(daysWithDetails);
    } catch (error) {
        console.error('Failed to fetch day details:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Create a new itinerary
router.post('/', async (req, res) => {
    const { title, start_date, end_date, destinations } = req.body;

    try {
        console.log('Creating itinerary with data:', { title, start_date, end_date, destinations });

        // Validate the required fields
        if (!title || !start_date || !end_date || !destinations) {
            console.log('Validation failed: Missing required fields');
            return res.status(400).json({ error: 'Title, start date, end date, and destinations are required' });
        }

        // Get the owner_id from the authenticated user (req.user.uid)
        const owner_id = req.user.uid;

        // Create the itinerary with the user as owner
        const newItinerary = await db.addItinerary({
            owner_id, 
            title, 
            start_date, 
            end_date, 
            destinations
        });

        const place = parseDestination(destinations);
        if (place.city && place.country) {
            try {
                await ensureDestinationChat(owner_id, {
                    country: place.country,
                    city: place.city,
                    itineraryId: newItinerary.itinerary_id,
                });
            } catch (chatError) {
                console.error('Could not create the destination chat:', chatError);
            }
        }

        console.log('New itinerary created:', newItinerary);
        res.status(201).json(newItinerary);
    } catch (error) {
        console.error('Failed to create itinerary:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Update an existing itinerary
router.put('/:itineraryId', async (req, res) => {
    try {
        const owner_id = req.user.uid;
        const itineraryId = Number(req.params.itineraryId);
        if (!Number.isFinite(itineraryId)) {
            return res.status(400).json({ error: 'Invalid itinerary id.' });
        }

        const title = String(req.body.title || '').trim();
        const start_date = req.body.start_date;
        const end_date = req.body.end_date;
        const destinations = String(req.body.destinations || req.body.destination || '').trim();

        if (!title || !start_date || !end_date) {
            return res.status(400).json({ error: 'Title, start date, and end date are required.' });
        }

        const updatedItinerary = await db.updateItinerary(itineraryId, owner_id, {
            title,
            start_date,
            end_date,
            destinations,
        });

        if (!updatedItinerary) {
            return res.status(404).json({ error: 'Itinerary not found, or you are not the host.' });
        }

        res.json(updatedItinerary);
    } catch (error) {
        console.error('Failed to update itinerary:', error);
        res.status(500).json({ error: 'Failed to update itinerary.', details: error.message });
    }
});

// Delete an itinerary
router.delete('/:itineraryId', async (req, res) => {
    try {
        const owner_id = req.user.uid; // Get the user id from the request
        const deletedItinerary = await db.deleteItinerary(req.params.itineraryId, owner_id);
        res.json(deletedItinerary);
    } catch (error) {
        console.error('Failed to delete itinerary:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Invite friend to itinerary
// Invite friend to itinerary
router.post('/invite', verifyToken, async (req, res) => {
    const { itineraryId, friendId } = req.body;
    const ownerId = req.user.uid;

    try {
        // Check if the itinerary belongs to the current user (host)
        const itinerary = await db.fetchItineraryById(itineraryId, ownerId);
        if (!itinerary) {
            return res.status(403).json({ error: 'Unauthorized to invite friends to this itinerary.' });
        }

        // Add friend to the share table for itinerary access as a guest
        const shareEntry = await db.addGuestToShare(itineraryId, friendId);
        notifyTripInvite({
            actorUid: ownerId,
            friendId,
            itineraryId,
            title: itinerary.title,
        });
        res.status(201).json(shareEntry); // Respond with the new share entry
    } catch (error) {
        console.error('Error inviting friend to itinerary:', error);
        res.status(500).json({ error: 'Failed to invite friend to itinerary.' });
    }
});


// Get itinerary details for a guest
router.get('/view/:itineraryId', verifyToken, async (req, res) => {
    const { itineraryId } = req.params;
    const guestId = req.user.uid;

    try {
        // Step 1: Verify guest access
        const checkAccessQuery = `
            SELECT 1 FROM core.shared
            WHERE itinerary_id = $1 AND guest_id = $2;
        `;
        const accessResult = await pool.query(checkAccessQuery, [itineraryId, guestId]);
        
        if (accessResult.rowCount === 0) {
            return res.status(403).json({ error: 'Access denied.' });
        }

        // Step 2: Fetch itinerary details from `itineraries`
        const itineraryQuery = 'SELECT * FROM core.itineraries WHERE itinerary_id = $1';
        const { rows } = await pool.query(itineraryQuery, [itineraryId]);
        
        if (!rows[0]) {
            return res.status(404).json({ error: 'Itinerary not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Failed to fetch itinerary:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});


module.exports = router;
