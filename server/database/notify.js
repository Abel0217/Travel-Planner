const pool = require('./db');
const { ensureNotificationTables } = require('./ensureNotificationTables');

function titleCase(value) {
    return String(value || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

async function notifyItineraryChange(itineraryId, actorUid, summary) {
    try {
        await ensureNotificationTables();
        const tripResult = await pool.query(
            'SELECT title FROM core.itineraries WHERE itinerary_id = $1',
            [itineraryId]
        );
        const actorResult = await pool.query(
            'SELECT first_name, last_name FROM core.users WHERE uid = $1',
            [actorUid]
        );
        const tripTitle = titleCase(tripResult.rows[0]?.title) || 'a shared trip';
        const actor = actorResult.rows[0] || {};
        const actorName = titleCase([actor.first_name, actor.last_name].filter(Boolean).join(' ')) || 'A collaborator';
        const sourceKey = `itinerary:${itineraryId}:${Date.now()}`;

        await pool.query(
            `INSERT INTO core.notifications
                (user_uid, category, event_type, title, body, itinerary_id, source_key)
             SELECT member.uid, 'itinerary', 'itinerary', $2, $3, $1, $4
             FROM (
                SELECT owner_id AS uid FROM core.itineraries WHERE itinerary_id = $1
                UNION
                SELECT guest_id AS uid FROM core.shared WHERE itinerary_id = $1
             ) member
             WHERE member.uid IS NOT NULL AND member.uid <> $5
             ON CONFLICT (user_uid, source_key) DO NOTHING`,
            [
                itineraryId,
                'Itinerary updated',
                `${actorName} ${summary} on ${tripTitle}.`,
                sourceKey,
                actorUid,
            ]
        );
    } catch (error) {
        console.error('Failed to record itinerary notification:', error.message);
    }
}

module.exports = { notifyItineraryChange };
