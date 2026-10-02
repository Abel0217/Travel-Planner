const pool = require('./db');

async function ensureNotificationTables() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS core.notifications (
            notification_id SERIAL PRIMARY KEY,
            user_uid TEXT NOT NULL,
            category TEXT NOT NULL,
            event_type TEXT NOT NULL,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            itinerary_id INTEGER,
            expense_id INTEGER,
            invitation_id INTEGER,
            friend_request_id INTEGER,
            source_key TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            read_at TIMESTAMPTZ,
            dismissed_at TIMESTAMPTZ,
            deleted_at TIMESTAMPTZ,
            UNIQUE (user_uid, source_key)
        )
    `);
    await pool.query(`
        ALTER TABLE core.notifications
        ADD COLUMN IF NOT EXISTS hidden_from_all BOOLEAN NOT NULL DEFAULT FALSE
    `);
    await pool.query(`
        CREATE INDEX IF NOT EXISTS notifications_user_idx
        ON core.notifications (user_uid, created_at DESC)
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS core.email_preferences (
            user_uid TEXT PRIMARY KEY,
            trip_reminder BOOLEAN NOT NULL DEFAULT TRUE,
            booking_added BOOLEAN NOT NULL DEFAULT TRUE,
            expense_added BOOLEAN NOT NULL DEFAULT TRUE,
            trip_wrap BOOLEAN NOT NULL DEFAULT TRUE,
            friend_request BOOLEAN NOT NULL DEFAULT TRUE,
            trip_invite BOOLEAN NOT NULL DEFAULT TRUE,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pool.query(`
        ALTER TABLE core.email_preferences
        ADD COLUMN IF NOT EXISTS friend_request BOOLEAN NOT NULL DEFAULT TRUE
    `);
    await pool.query(`
        ALTER TABLE core.email_preferences
        ADD COLUMN IF NOT EXISTS trip_invite BOOLEAN NOT NULL DEFAULT TRUE
    `);
    await pool.query(`
        ALTER TABLE core.email_preferences
        ADD COLUMN IF NOT EXISTS chat_message BOOLEAN NOT NULL DEFAULT TRUE
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS core.email_log (
            email_log_id SERIAL PRIMARY KEY,
            user_uid TEXT NOT NULL,
            kind TEXT NOT NULL,
            ref_key TEXT NOT NULL,
            sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (user_uid, kind, ref_key)
        )
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS core.chat_seen (
            user_uid TEXT NOT NULL,
            itinerary_id INTEGER NOT NULL,
            seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (user_uid, itinerary_id)
        )
    `);
}

module.exports = { ensureNotificationTables };
