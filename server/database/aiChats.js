const pool = require('./db');

function titleCasePlace(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function parseDestination(destinations) {
  const parts = String(destinations || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) return { city: '', country: '' };
  if (parts.length === 1) return { city: parts[0], country: parts[0] };
  return { city: parts[0], country: parts[parts.length - 1] };
}

async function unifyCityChats(uid, country, city, preferredId = null) {
  const { rows } = await pool.query(
    `SELECT id, country, city, itinerary_id, updated_at
     FROM core.ai_chats
     WHERE user_uid = $1 AND LOWER(country) = LOWER($2) AND LOWER(city) = LOWER($3)
     ORDER BY (itinerary_id IS NULL) ASC, updated_at DESC`,
    [uid, country, city]
  );

  if (!rows.length) return null;

  const keeper = rows.find((row) => row.id === preferredId) || rows[0];
  const extraIds = rows.filter((row) => row.id !== keeper.id).map((row) => row.id);
  if (extraIds.length) {
    await pool.query(
      `UPDATE core.ai_messages SET chat_id = $1 WHERE chat_id = ANY($2::int[])`,
      [keeper.id, extraIds]
    );
    await pool.query(`DELETE FROM core.ai_chats WHERE id = ANY($1::int[])`, [extraIds]);
  }
  return keeper;
}

async function findDestinationChat(uid, country, city, itineraryId = null) {
  const placeCountry = titleCasePlace(country);
  const placeCity = titleCasePlace(city);

  if (itineraryId) {
    const scoped = await pool.query(
      `SELECT id, country, city, itinerary_id, updated_at
       FROM core.ai_chats
       WHERE user_uid = $1 AND itinerary_id = $2`,
      [uid, itineraryId]
    );
    if (scoped.rows[0]) {
      return unifyCityChats(uid, scoped.rows[0].country, scoped.rows[0].city, scoped.rows[0].id);
    }
  }

  if (!placeCountry || !placeCity) return null;
  return unifyCityChats(uid, placeCountry, placeCity);
}

async function ensureDestinationChat(uid, { country, city, itineraryId = null }) {
  const placeCountry = titleCasePlace(country);
  const placeCity = titleCasePlace(city);
  if (!placeCountry || !placeCity) return null;

  const existing = await findDestinationChat(uid, placeCountry, placeCity, itineraryId);
  if (existing) {
    if (itineraryId && !existing.itinerary_id) {
      const updated = await pool.query(
        `UPDATE core.ai_chats
         SET itinerary_id = $2, updated_at = NOW()
         WHERE id = $1 AND itinerary_id IS NULL
         RETURNING id, country, city, itinerary_id, updated_at`,
        [existing.id, itineraryId]
      );
      if (updated.rows[0]) return updated.rows[0];
    }
    return existing;
  }

  const inserted = await pool.query(
    `INSERT INTO core.ai_chats (user_uid, country, city, itinerary_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, country, city, itinerary_id, updated_at`,
    [uid, placeCountry, placeCity, itineraryId || null]
  );
  return inserted.rows[0];
}

async function deleteDestinationChat(uid, country, city) {
  const result = await pool.query(
    `DELETE FROM core.ai_chats
     WHERE user_uid = $1 AND LOWER(country) = LOWER($2) AND LOWER(city) = LOWER($3)`,
    [uid, titleCasePlace(country), titleCasePlace(city)]
  );
  return result.rowCount;
}

module.exports = {
  titleCasePlace,
  parseDestination,
  findDestinationChat,
  ensureDestinationChat,
  deleteDestinationChat,
};
