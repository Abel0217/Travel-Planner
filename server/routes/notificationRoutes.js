const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations');
const verifyToken = require('../FirebaseToken');
const pool = require('../database/db');
const { listNotifications } = require('../database/notificationFeed');

router.use(verifyToken);

router.get('/', async (req, res) => {
    try {
        const feed = await listNotifications(req.user.uid);
        res.json(feed);
    } catch (error) {
        console.error('Failed to load notifications:', error.message);
        res.status(500).json({ error: 'Failed to load notifications.' });
    }
});

router.patch('/read-all', async (req, res) => {
    try {
        await pool.query(
            `UPDATE core.notifications
             SET read_at = NOW()
             WHERE user_uid = $1 AND read_at IS NULL AND dismissed_at IS NULL AND deleted_at IS NULL`,
            [req.user.uid]
        );
        res.json(await listNotifications(req.user.uid));
    } catch (error) {
        console.error('Failed to mark notifications read:', error.message);
        res.status(500).json({ error: 'Failed to mark notifications read.' });
    }
});

router.patch('/:notificationId/read', async (req, res) => {
    try {
        await pool.query(
            `UPDATE core.notifications
             SET read_at = COALESCE(read_at, NOW())
             WHERE notification_id = $1 AND user_uid = $2 AND deleted_at IS NULL`,
            [req.params.notificationId, req.user.uid]
        );
        res.json(await listNotifications(req.user.uid));
    } catch (error) {
        console.error('Failed to mark notification read:', error.message);
        res.status(500).json({ error: 'Failed to mark that notification read.' });
    }
});

router.patch('/:notificationId/dismiss', async (req, res) => {
    try {
        await pool.query(
            `UPDATE core.notifications
             SET dismissed_at = COALESCE(dismissed_at, NOW()),
                 hidden_from_all = TRUE
             WHERE notification_id = $1 AND user_uid = $2 AND deleted_at IS NULL`,
            [req.params.notificationId, req.user.uid]
        );
        res.json(await listNotifications(req.user.uid));
    } catch (error) {
        console.error('Failed to dismiss notification:', error.message);
        res.status(500).json({ error: 'Failed to dismiss that notification.' });
    }
});

router.delete('/clear', async (req, res) => {
    try {
        await pool.query(
            `UPDATE core.notifications
             SET dismissed_at = COALESCE(dismissed_at, NOW()),
                 hidden_from_all = TRUE
             WHERE user_uid = $1 AND deleted_at IS NULL AND dismissed_at IS NULL`,
            [req.user.uid]
        );
        res.json(await listNotifications(req.user.uid));
    } catch (error) {
        console.error('Failed to clear notifications:', error.message);
        res.status(500).json({ error: 'Failed to clear notifications.' });
    }
});

router.delete('/:notificationId', async (req, res) => {
    try {
        await pool.query(
            `UPDATE core.notifications
             SET deleted_at = COALESCE(deleted_at, NOW()),
                 dismissed_at = COALESCE(dismissed_at, NOW())
             WHERE notification_id = $1 AND user_uid = $2`,
            [req.params.notificationId, req.user.uid]
        );
        res.json(await listNotifications(req.user.uid));
    } catch (error) {
        console.error('Failed to delete notification:', error.message);
        res.status(500).json({ error: 'Failed to delete that notification.' });
    }
});

// Fetch only itinerary invitations for the logged-in user
// Express Router (Notifications Router)
router.post('/chat', async (req, res) => {
    try {
        await saveChatAlerts(req.user.uid, req.body, false);
        res.json(await listNotifications(req.user.uid));
    } catch (error) {
        console.error('Failed to save chat notification:', error.message);
        res.status(error.status || 500).json({ error: 'Failed to save that chat alert.' });
    }
});

router.post('/chat/sync', async (req, res) => {
    try {
        await saveChatAlerts(req.user.uid, req.body, true);
        res.json(await listNotifications(req.user.uid));
    } catch (error) {
        console.error('Failed to sync chat notifications:', error.message);
        res.status(error.status || 500).json({ error: 'Failed to sync chat alerts.' });
    }
});

router.get('/chat/trips', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT itinerary_id, title FROM core.itineraries WHERE owner_id = $1
             UNION
             SELECT i.itinerary_id, i.title
             FROM core.itineraries i
             JOIN core.shared s ON s.itinerary_id = i.itinerary_id
             WHERE s.guest_id = $1`,
            [req.user.uid]
        );
        res.json(rows);
    } catch (error) {
        console.error('Failed to load chat trips:', error.message);
        res.status(500).json({ error: 'Failed to load chat trips.' });
    }
});

router.get('/chat/seen', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT itinerary_id, seen_at FROM core.chat_seen WHERE user_uid = $1',
            [req.user.uid]
        );
        res.json(rows);
    } catch (error) {
        console.error('Failed to load chat seen state:', error.message);
        res.status(500).json({ error: 'Failed to load chat seen state.' });
    }
});

router.get('/chat/receipts', async (req, res) => {
    const itineraryId = Number(req.query.itineraryId);
    if (!itineraryId) return res.status(400).json({ error: 'An itinerary is required.' });
    try {
        const access = await pool.query(
            `SELECT 1
             FROM core.itineraries i
             WHERE i.itinerary_id = $1
               AND (
                 i.owner_id = $2
                 OR EXISTS (SELECT 1 FROM core.shared s WHERE s.itinerary_id = i.itinerary_id AND s.guest_id = $2)
               )`,
            [itineraryId, req.user.uid]
        );
        if (!access.rows[0]) return res.status(403).json({ error: 'Access denied.' });
        const { rows } = await pool.query(
            `SELECT c.user_uid, c.seen_at, u.first_name, u.last_name
             FROM core.chat_seen c
             LEFT JOIN core.users u ON u.uid = c.user_uid
             WHERE c.itinerary_id = $1 AND c.user_uid <> $2`,
            [itineraryId, req.user.uid]
        );
        res.json(rows.map((row) => ({
            user_uid: row.user_uid,
            seen_at: row.seen_at,
            name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Traveler',
        })));
    } catch (error) {
        console.error('Failed to load chat receipts:', error.message);
        res.status(500).json({ error: 'Failed to load chat receipts.' });
    }
});

router.post('/chat/seen', async (req, res) => {
    const itineraryId = Number(req.body.itineraryId);
    if (!itineraryId) return res.status(400).json({ error: 'An itinerary is required.' });
    try {
        await pool.query(
            `INSERT INTO core.chat_seen (user_uid, itinerary_id, seen_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (user_uid, itinerary_id)
             DO UPDATE SET seen_at = NOW()`,
            [req.user.uid, itineraryId]
        );
        await pool.query(
            `UPDATE core.notifications
             SET read_at = COALESCE(read_at, NOW())
             WHERE user_uid = $1 AND itinerary_id = $2 AND event_type = 'chat' AND deleted_at IS NULL`,
            [req.user.uid, itineraryId]
        );
        res.json(await listNotifications(req.user.uid));
    } catch (error) {
        console.error('Failed to mark chat seen:', error.message);
        res.status(500).json({ error: 'Failed to mark that chat seen.' });
    }
});

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


async function saveChatAlerts(userUid, body, forSelf) {
    const { ensureNotificationTables } = require('../database/ensureNotificationTables');
    await ensureNotificationTables();
    const itineraryId = Number(body.itineraryId);
    if (!itineraryId) {
        const error = new Error('An itinerary is required.');
        error.status = 400;
        throw error;
    }
    const access = await pool.query(
        `SELECT i.title
         FROM core.itineraries i
         WHERE i.itinerary_id = $1
           AND (
             i.owner_id = $2
             OR EXISTS (SELECT 1 FROM core.shared s WHERE s.itinerary_id = i.itinerary_id AND s.guest_id = $2)
           )`,
        [itineraryId, userUid]
    );
    if (!access.rows[0]) {
        const error = new Error('Access denied.');
        error.status = 403;
        throw error;
    }
    const tripTitle = access.rows[0].title || 'A Trip';
    const incoming = forSelf
        ? (Array.isArray(body.messages) ? body.messages : [])
        : [{
            messageId: body.messageId,
            text: body.text,
            userName: body.userName,
            userId: userUid,
            timestamp: new Date().toISOString(),
        }];
    const seen = forSelf
        ? await pool.query(
            'SELECT seen_at FROM core.chat_seen WHERE user_uid = $1 AND itinerary_id = $2',
            [userUid, itineraryId]
        )
        : { rows: [] };
    const seenAt = seen.rows[0]?.seen_at ? new Date(seen.rows[0].seen_at) : null;
    const recipients = forSelf
        ? [userUid]
        : (await pool.query(
            `SELECT owner_id AS uid FROM core.itineraries WHERE itinerary_id = $1
             UNION
             SELECT guest_id AS uid FROM core.shared WHERE itinerary_id = $1`,
            [itineraryId]
        )).rows.map((row) => row.uid).filter((uid) => uid && uid !== userUid);
    const cutoff = Date.now() - (48 * 60 * 60 * 1000);

    for (const message of incoming.slice(0, 10)) {
        const text = String(message.text || '').replace(/\s+/g, ' ').trim();
        const messageId = String(message.messageId || '').trim();
        if (!text || !messageId) continue;
        if (forSelf && message.userId === userUid) continue;
        const when = message.timestamp ? new Date(message.timestamp) : new Date();
        if (Number.isNaN(when.getTime())) continue;
        if (forSelf && when.getTime() < cutoff) continue;
        if (forSelf && seenAt && when <= seenAt) continue;
        const sender = String(message.userName || 'A Traveler').trim();
        const snippet = text.length > 80 ? `${text.slice(0, 77)}...` : text;
        for (const recipient of recipients) {
            await pool.query(
                `INSERT INTO core.notifications
                    (user_uid, category, event_type, title, body, itinerary_id, source_key, created_at)
                 VALUES ($1, 'social', 'chat', 'New Message', $2, $3, $4, $5)
                 ON CONFLICT (user_uid, source_key) DO NOTHING`,
                [recipient, `${sender} On ${tripTitle}: ${snippet}`, itineraryId, `chat:${itineraryId}:${messageId}`, when]
            );
        }
    }
    if (!forSelf) {
        const message = incoming[0] || {};
        const text = String(message.text || '').replace(/\s+/g, ' ').trim();
        const messageId = String(message.messageId || '').trim();
        if (text && messageId) {
            const { notifyChatMessage } = require('../services/tripMail');
            notifyChatMessage({
                itineraryId,
                actorUid: userUid,
                messageId,
                text,
                userName: message.userName,
            });
        }
    }
}

module.exports = router;
