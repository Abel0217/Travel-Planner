const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations'); 
const authenticateToken = require('../FirebaseToken'); 
const { Pool } = require("pg");

// Search for users by email
router.get('/search', authenticateToken, async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ error: 'Email query parameter is required.' });
    }

    try {
        const user = await db.getUserByEmail(email); 
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('Error during user search:', error.message);
        res.status(500).json({ error: 'Failed to search for user.' });
    }
});

// Send a friend request
router.post('/request', authenticateToken, async (req, res) => {
    const requester_uid = req.user.uid;
    const { requestee_uid } = req.body;

    if (!requestee_uid) {
        return res.status(400).json({ error: 'Requestee UID is required.' });
    }

    try {
        const existingRequest = await db.checkFriendshipExists(requester_uid, requestee_uid);
        if (existingRequest) {
            return res.status(400).json({ error: 'Friend request already exists or users are already friends.' });
        }

        const newRequest = await db.createFriendRequest(requester_uid, requestee_uid);
        res.status(201).json(newRequest);
    } catch (error) {
        console.error('Error sending friend request:', error);
        res.status(500).json({ error: 'Failed to send friend request.' });
    }
});

// Accept a friend request
router.put('/request/:id/accept', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const updatedRequest = await db.updateFriendRequestStatus(id, 'accepted');
        await db.createFriendship(updatedRequest.requester_id, updatedRequest.requestee_id);
        res.status(200).json({ message: 'Friend request accepted.' });
    } catch (error) {
        console.error('Error accepting friend request:', error);
        res.status(500).json({ error: 'Failed to accept friend request.' });
    }
});

// Reject a friend request
router.put('/request/:id/reject', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        await db.updateFriendRequestStatus(id, 'rejected');
        res.status(200).json({ message: 'Friend request rejected.' });
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        res.status(500).json({ error: 'Failed to reject friend request.' });
    }
});

// Fetch incoming friend requests
router.get('/requests/incoming', authenticateToken, async (req, res) => {
    const uid = req.user.uid;
    try {
        const incomingRequests = await db.fetchIncomingRequests(uid);
        res.status(200).json(incomingRequests);
    } catch (error) {
        console.error('Error fetching incoming friend requests:', error);
        res.status(500).json({ error: 'Failed to fetch incoming friend requests.' });
    }
});

// Fetch outgoing friend requests
router.get('/requests/outgoing', authenticateToken, async (req, res) => {
    const uid = req.user.uid;
    try {
        const outgoingRequests = await db.fetchOutgoingRequests(uid);
        res.status(200).json(outgoingRequests);
    } catch (error) {
        console.error('Error fetching outgoing friend requests:', error);
        res.status(500).json({ error: 'Failed to fetch outgoing friend requests.' });
    }
});

// Fetch all pending friend requests for a user
router.get('/requests/:userId', authenticateToken, async (req, res) => {
    const { userId } = req.params;

    try {
        const requests = await db.fetchPendingFriendRequests(userId);
        res.status(200).json(requests);
    } catch (error) {
        console.error('Error fetching pending friend requests:', error);
        res.status(500).json({ error: 'Failed to fetch friend requests.' });
    }
});

// Get a list of friends for a user
router.get('/list/:userId', authenticateToken, async (req, res) => {
    const { userId } = req.params;

    try {
        const friends = await db.fetchUserFriends(userId);
        res.status(200).json(friends);
    } catch (error) {
        console.error('Error fetching friends list:', error);
        res.status(500).json({ error: 'Failed to fetch friends list.' });
    }
});

// Ensure the backend is correctly reading this field from req.body
router.delete('/request/cancel', authenticateToken, async (req, res) => {
    const { requester_uid, requestee_uid } = req.body;

    console.log("Requester UID (Backend):", requester_uid);
    console.log("Requestee UID (Backend):", requestee_uid);

    if (!requester_uid || !requestee_uid) {
        return res.status(400).json({
            error: `Missing parameters: ${
                !requester_uid ? "requester_uid" : ""
            } ${!requestee_uid ? "requestee_uid" : ""}`,
        });
    }

    try {
        const query = `
            DELETE FROM core.friend_requests
            WHERE requester_id = $1 AND requestee_id = $2;
        `;
        const values = [requester_uid, requestee_uid];
        const result = await db.pool.query(query, values); // Use `db.pool.query`

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "No matching friend request found." });
        }

        res.status(200).json({ message: "Friend request canceled successfully." });
    } catch (error) {
        console.error("Error canceling friend request:", error.message);
        res.status(500).json({ error: "Failed to cancel friend request." });
    }
});

// Remove a friend
router.post('/remove', authenticateToken, async (req, res) => {
    const uid = req.user.uid; 
    const { friend_uid } = req.body;

    if (!friend_uid) {
        return res.status(400).json({ error: 'Friend UID is required.' });
    }

    try {
        await db.removeFriend(uid, friend_uid);
        return res.status(200).json({ message: 'Friend removed successfully.' });
    } catch (error) {
        console.error('Error removing friend:', error);
        return res.status(500).json({ error: 'Failed to remove friend.' });
    }
});

module.exports = router;
