const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations');
const verifyToken = require('../FirebaseToken');

// Apply token verification middleware to all notification routes
router.use(verifyToken);

// Fetch only itinerary invitations for the logged-in user
// Express Router (Notifications Router)
router.get('/invitations', async (req, res) => {
    const owner_id = req.user.uid;

    try {
        console.log(`Fetching invitations for owner_id: ${owner_id}`);
        const invitations = await db.fetchUserInvitations(owner_id);

        console.log('Invitations fetched:', invitations);

        const invitationNotifications = invitations.map(invite => ({
            invitation_id: invite.invitation_id,
            itinerary_id: invite.itinerary_id,
            itinerary_title: invite.itinerary_title,
            invited_at: invite.invited_at,
            inviter_first_name: invite.inviter_first_name,
            inviter_last_name: invite.inviter_last_name,
            inviter_profile_picture: invite.inviter_profile_picture
        }));

        res.status(200).json(invitationNotifications);
    } catch (error) {
        console.error('Error fetching invitations in /invitations route:', error.message, error.stack);
        res.status(500).json({ error: `Failed to fetch itinerary invitations: ${error.message}` });
    }
});


// Accept an invitation
router.put('/invitations/:invitationId/accept', async (req, res) => {
    const { invitationId } = req.params;
    const userId = req.user.uid; // Assuming Firebase Authentication provides req.user

    try {
        const result = await db.acceptInvitation(invitationId, userId);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error accepting invitation:', error.message);
        res.status(500).json({ error: 'Failed to accept invitation' });
    }
});


// Decline an invitation
router.put('/invitations/:invitationId/decline', verifyToken, async (req, res) => {
    const { invitationId } = req.params;
    const userId = req.user.uid;

    console.log(`Decline request for invitation ${invitationId} by user ${userId}`);

    try {
        const result = await db.declineInvitation(invitationId, userId);

        if (!result) {
            return res.status(404).json({ error: 'Invitation not found or already deleted' });
        }

        res.status(200).json({ message: 'Invitation declined (deleted) successfully' });
    } catch (error) {
        console.error('Error declining (deleting) invitation:', error);
        res.status(500).json({ error: 'Failed to decline invitation', details: error.message });
    }
});


module.exports = router;
