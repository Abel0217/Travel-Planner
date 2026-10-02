const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations'); 
const authenticateToken = require('../FirebaseToken');
const { notifyFriendRequest } = require('../services/tripMail'); 
const { Pool } = require("pg");

// Search for users by email
router.get('/search', authenticateToken, async (req, res) => {
    const email = String(req.query.email || '').trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Enter a valid email address.' });
    }

    try {
        const { rows } = await db.pool.query(
            `SELECT uid, first_name, last_name, email, profile_picture
             FROM core.users
             WHERE lower(email) = lower($1)
             LIMIT 1`,
            [email]
        );
        const user = rows[0];
        if (!user) {
            return res.status(404).json({ error: 'No account uses that email.' });
        }

        if (user.uid === req.user.uid) {
            return res.status(200).json({ ...user, relation: 'self' });
        }

        const alreadyFriends = await db.checkFriendshipExists(req.user.uid, user.uid);
        if (alreadyFriends) {
            return res.status(200).json({ ...user, relation: 'friend' });
        }

        const pending = await db.pool.query(
            `SELECT requester_id
             FROM core.friend_requests
             WHERE status = 'pending'
               AND ((requester_id = $1 AND requestee_id = $2) OR (requester_id = $2 AND requestee_id = $1))
             LIMIT 1`,
            [req.user.uid, user.uid]
        );
        const relation = !pending.rows[0]
            ? 'none'
            : pending.rows[0].requester_id === req.user.uid
                ? 'outgoing'
                : 'incoming';

        res.status(200).json({ ...user, relation });
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
        const alreadyFriends = await db.checkFriendshipExists(requester_uid, requestee_uid);
        if (alreadyFriends) {
            return res.status(400).json({ error: 'You are already friends.', relation: 'friend' });
        }

        const pending = await db.pool.query(
            `SELECT requester_id
             FROM core.friend_requests
             WHERE status = 'pending'
               AND ((requester_id = $1 AND requestee_id = $2) OR (requester_id = $2 AND requestee_id = $1))
             LIMIT 1`,
            [requester_uid, requestee_uid]
        );
        if (pending.rows[0]) {
            const relation = pending.rows[0].requester_id === requester_uid ? 'outgoing' : 'incoming';
            return res.status(400).json({
                error: relation === 'outgoing' ? 'A request is already pending.' : 'This person already sent you a request.',
                relation,
            });
        }

        const newRequest = await db.createFriendRequest(requester_uid, requestee_uid);
        notifyFriendRequest({
            requesterUid: requester_uid,
            requesteeUid: requestee_uid,
            requestId: newRequest.request_id,
        });
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

function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

router.get('/overview', authenticateToken, async (req, res) => {
    const uid = req.user.uid;
    try {
        const friends = await db.fetchUserFriends(uid);
        const ids = friends.map((friend) => friend.uid);
        const tripsByFriend = {};
        const balanceByFriend = {};
        ids.forEach((id) => {
            tripsByFriend[id] = [];
            balanceByFriend[id] = 0;
        });

        if (ids.length) {
            const trips = await db.pool.query(
                `WITH mine AS (
                    SELECT itinerary_id FROM core.itineraries WHERE owner_id = $1
                    UNION
                    SELECT itinerary_id FROM core.shared WHERE guest_id = $1
                )
                SELECT DISTINCT member.uid AS friend_uid, i.itinerary_id, i.title, i.end_date
                FROM (
                    SELECT itinerary_id, owner_id AS uid FROM core.itineraries
                    UNION ALL
                    SELECT itinerary_id, guest_id AS uid FROM core.shared
                ) member
                JOIN mine ON mine.itinerary_id = member.itinerary_id
                JOIN core.itineraries i ON i.itinerary_id = member.itinerary_id
                WHERE member.uid = ANY($2::text[])`,
                [uid, ids]
            );

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const itineraryIds = [];
            trips.rows.forEach((row) => {
                if (!itineraryIds.includes(row.itinerary_id)) itineraryIds.push(row.itinerary_id);
                const end = row.end_date ? new Date(row.end_date) : null;
                tripsByFriend[row.friend_uid].push({
                    itinerary_id: row.itinerary_id,
                    title: row.title,
                    end_date: row.end_date,
                    active: !end || end >= today,
                });
            });

            if (itineraryIds.length) {
                const expenses = await db.pool.query(
                    `SELECT expense_id, itinerary_id, amount, COALESCE(paid_by, created_by) AS payer
                     FROM core.expenses
                     WHERE itinerary_id = ANY($1::int[])`,
                    [itineraryIds]
                ).catch(() => ({ rows: [] }));
                const shares = await db.pool.query(
                    `SELECT s.expense_id, s.user_uid, s.amount
                     FROM core.expense_shares s
                     JOIN core.expenses e ON e.expense_id = s.expense_id
                     WHERE e.itinerary_id = ANY($1::int[])`,
                    [itineraryIds]
                ).catch(() => ({ rows: [] }));
                const payments = await db.pool.query(
                    `SELECT itinerary_id, from_uid, to_uid, amount
                     FROM core.expense_payments
                     WHERE itinerary_id = ANY($1::int[])
                       AND (from_uid = $2 OR to_uid = $2)`,
                    [itineraryIds, uid]
                ).catch(() => ({ rows: [] }));

                const friendsOnTrip = {};
                trips.rows.forEach((row) => {
                    if (!friendsOnTrip[row.itinerary_id]) friendsOnTrip[row.itinerary_id] = [];
                    if (!friendsOnTrip[row.itinerary_id].includes(row.friend_uid)) {
                        friendsOnTrip[row.itinerary_id].push(row.friend_uid);
                    }
                });

                expenses.rows.forEach((expense) => {
                    (friendsOnTrip[expense.itinerary_id] || []).forEach((friendUid) => {
                        const friendShare = shares.rows.find((share) => share.expense_id === expense.expense_id && share.user_uid === friendUid);
                        const myShare = shares.rows.find((share) => share.expense_id === expense.expense_id && share.user_uid === uid);
                        if (expense.payer === uid && friendShare) balanceByFriend[friendUid] += Number(friendShare.amount);
                        if (expense.payer === friendUid && myShare) balanceByFriend[friendUid] -= Number(myShare.amount);
                    });
                });

                payments.rows.forEach((payment) => {
                    (friendsOnTrip[payment.itinerary_id] || []).forEach((friendUid) => {
                        if (payment.from_uid === friendUid && payment.to_uid === uid) {
                            balanceByFriend[friendUid] -= Number(payment.amount);
                        }
                        if (payment.from_uid === uid && payment.to_uid === friendUid) {
                            balanceByFriend[friendUid] += Number(payment.amount);
                        }
                    });
                });
            }
        }

        res.json({
            friends: friends.map((friend) => ({
                ...friend,
                trips: (tripsByFriend[friend.uid] || []).sort((a, b) => Number(b.active) - Number(a.active)),
                balance: roundMoney(balanceByFriend[friend.uid] || 0),
            })),
        });
    } catch (error) {
        console.error('Error building friends overview:', error);
        res.status(500).json({ error: 'Failed to load friends.' });
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
