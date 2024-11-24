const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations'); // Import pool directly if db.pool is not accessible
const authenticateToken = require('../FirebaseToken'); 
const verifyToken = require('../FirebaseToken');
const pool = require('../database/db'); // Adjust the path based on where your dbConfig file is located

// Invite friend to itinerary
router.post('/invite', verifyToken, async (req, res) => {
    const { itineraryId, friendId } = req.body;
    const ownerId = req.user.uid;

    try {
        // Verify that the current user is the owner of the itinerary
        const itinerary = await db.fetchItineraryById(itineraryId, ownerId);
        if (!itinerary) {
            return res.status(403).json({ error: 'Unauthorized to invite friends to this itinerary.' });
        }

        // Check if an invitation already exists
        const existingInvitationQuery = `
            SELECT * FROM core.invitations
            WHERE itinerary_id = $1 AND invitee_id = $2 AND status = 'pending';
        `;
        const { rows: existingInvitationRows } = await db.pool.query(existingInvitationQuery, [itineraryId, friendId]);

        if (existingInvitationRows.length > 0) {
            return res.status(400).json({ error: 'Invitation already sent to this user.' });
        }

        // Check if the user is already a participant in the itinerary
        const existingParticipantQuery = `
            SELECT * FROM core.shared
            WHERE itinerary_id = $1 AND guest_id = $2;
        `;
        const { rows: existingParticipantRows } = await db.pool.query(existingParticipantQuery, [itineraryId, friendId]);

        if (existingParticipantRows.length > 0) {
            return res.status(400).json({ error: 'User is already a participant in this itinerary.' });
        }

        // Insert the invitation if all checks pass
        const invitationQuery = `
            INSERT INTO core.invitations (itinerary_id, inviter_id, invitee_id, status)
            VALUES ($1, $2, $3, 'pending')
            RETURNING *;
        `;
        const { rows: invitationRows } = await db.pool.query(invitationQuery, [itineraryId, ownerId, friendId]);
        const invitation = invitationRows[0];

        res.status(201).json({ message: 'Friend invited successfully', invitation });
    } catch (error) {
        console.error('Error inviting friend to itinerary:', error);
        res.status(500).json({ error: 'Failed to invite friend to itinerary.' });
    }
});

// Accept an itinerary invitation
router.put('/accept', verifyToken, async (req, res) => {
    const { invitationId } = req.body;
    const userId = req.user.uid;

    try {
        const result = await acceptInvitation(invitationId, userId);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to accept invitation' });
    }
});

// Decline an itinerary invitation
router.post('/decline', verifyToken, async (req, res) => {
    const { invitationId } = req.body;
    const userId = req.user.uid;

    try {
        const result = await declineInvitation(invitationId, userId);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to decline invitation' });
    }
});

router.post('/leave', verifyToken, async (req, res) => {
    const { itineraryId } = req.body;
    const guestId = req.user.uid;

    try {
        const deleteQuery = `
            DELETE FROM core.shared
            WHERE itinerary_id = $1 AND guest_id = $2;
        `;
        await pool.query(deleteQuery, [itineraryId, guestId]);

        res.status(200).json({ message: 'Successfully left the itinerary.' });
    } catch (error) {
        console.error('Error leaving itinerary:', error);
        res.status(500).json({ error: 'Failed to leave itinerary.' });
    }
});

router.get('/shared', verifyToken, async (req, res) => {
    const userId = req.user.uid;
    console.log(`Fetching shared itineraries for userId: ${userId}`); // Add this log

    try {
        const sharedItineraries = await db.fetchUserSharedItineraries(userId);
        console.log('Shared itineraries fetched from database:', sharedItineraries); // Log the results
        res.status(200).json(sharedItineraries);
    } catch (error) {
        console.error('Error fetching shared itineraries:', error);
        res.status(500).json({ error: 'Failed to fetch shared itineraries' });
    }
});

// Fetch all participants of a shared itinerary
router.get('/participants/:itineraryId', authenticateToken, async (req, res) => {
    const { itineraryId } = req.params;

    try {
        const participants = await db.fetchItineraryParticipants(itineraryId);
        res.status(200).json(participants);
    } catch (error) {
        console.error('Error fetching participants:', error);
        res.status(500).json({ error: 'Failed to fetch participants.', details: error.message });
    }
});


// Check invite status
router.post('/invite-check', verifyToken, async (req, res) => {
    const { itineraryId, friendId } = req.body;
    const ownerId = req.user.uid;

    try {
        // Verify that the current user is the owner of the itinerary
        const itinerary = await db.fetchItineraryById(itineraryId, ownerId);
        if (!itinerary) {
            return res.status(403).json({ error: 'Unauthorized to invite friends to this itinerary.' });
        }

        // Check if the friend has already been invited
        const existingInviteQuery = `
            SELECT * FROM core.invitations
            WHERE itinerary_id = $1 AND invitee_id = $2 AND status = 'pending';
        `;
        const existingInvite = await pool.query(existingInviteQuery, [itineraryId, friendId]);

        if (existingInvite.rowCount > 0) {
            return res.status(200).json({ status: 'already_invited' });
        }

        // Check if the friend is already a participant
        const participantQuery = `
            SELECT * FROM core.participants
            WHERE itinerary_id = $1 AND user_id = $2;
        `;
        const isParticipant = await pool.query(participantQuery, [itineraryId, friendId]);

        if (isParticipant.rowCount > 0) {
            return res.status(200).json({ status: 'already_participant' });
        }

        // If no issues, return success
        return res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error('Error checking invite status:', error);
        res.status(500).json({ error: 'Failed to check invite status.' });
    }
});

module.exports = router;
