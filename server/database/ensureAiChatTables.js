const pool = require('./db');

async function ensureAiChatTables() {
  await pool.query('CREATE SCHEMA IF NOT EXISTS core');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS core.ai_chats (
      id SERIAL PRIMARY KEY,
      user_uid TEXT NOT NULL,
      country TEXT NOT NULL,
      city TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ai_chats_user_country_city
      ON core.ai_chats (user_uid, LOWER(country), LOWER(city))
  `);

  await pool.query(`ALTER TABLE core.ai_chats ADD COLUMN IF NOT EXISTS itinerary_id INTEGER`);

  await pool.query(`DROP INDEX IF EXISTS core.ai_chats_user_country_city`);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ai_chats_user_country_city_open
      ON core.ai_chats (user_uid, LOWER(country), LOWER(city))
      WHERE itinerary_id IS NULL
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ai_chats_user_itinerary
      ON core.ai_chats (user_uid, itinerary_id)
      WHERE itinerary_id IS NOT NULL
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS core.ai_messages (
      id SERIAL PRIMARY KEY,
      chat_id INTEGER NOT NULL REFERENCES core.ai_chats(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

module.exports = { ensureAiChatTables };
