const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const verifyToken = require('../FirebaseToken');
const { askTravelGuide } = require('../services/claudeTravelGuide');
const { fetchUserName } = require('../database/dbOperations');
const {
  titleCasePlace,
  findDestinationChat,
  ensureDestinationChat,
  deleteDestinationChat,
} = require('../database/aiChats');

router.use(verifyToken);

function nestChats(rows) {
  const countries = [];
  const byCountry = new Map();

  rows.forEach((row) => {
    if (!byCountry.has(row.country)) {
      const entry = { country: row.country, cities: [] };
      byCountry.set(row.country, entry);
      countries.push(entry);
    }
    byCountry.get(row.country).cities.push({
      id: row.id,
      city: row.city,
      itineraryId: row.itinerary_id,
      updatedAt: row.updated_at,
    });
  });

  return countries;
}

router.get('/chats', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, country, city, itinerary_id, updated_at
       FROM core.ai_chats
       WHERE user_uid = $1
       ORDER BY country ASC, city ASC`,
      [req.user.uid]
    );
    res.json({ countries: nestChats(rows) });
  } catch (error) {
    console.error('Failed to list AI chats:', error);
    res.status(500).json({ error: 'Failed to load saved travel chats.' });
  }
});

router.post('/chats', async (req, res) => {
  const country = titleCasePlace(req.body.country);
  const city = titleCasePlace(req.body.city);
  const itineraryId = req.body.itinerary_id ? Number(req.body.itinerary_id) : null;

  if (!country || !city) {
    return res.status(400).json({ error: 'Country and city are required.' });
  }

  try {
    const chat = await ensureDestinationChat(req.user.uid, { country, city, itineraryId });
    res.status(200).json(chat);
  } catch (error) {
    console.error('Failed to create AI chat:', error);
    res.status(500).json({ error: 'Failed to start that destination chat.' });
  }
});

router.get('/chats/:country/:city/messages', async (req, res) => {
  const country = titleCasePlace(req.params.country);
  const city = titleCasePlace(req.params.city);
  const itineraryId = req.query.itineraryId ? Number(req.query.itineraryId) : null;

  try {
    const chat = await findDestinationChat(req.user.uid, country, city, itineraryId);
    if (!chat) {
      return res.json({ chat: null, messages: [] });
    }

    const messages = await pool.query(
      `SELECT id, role, content, created_at
       FROM core.ai_messages
       WHERE chat_id = $1
       ORDER BY created_at ASC`,
      [chat.id]
    );

    res.json({ chat, messages: messages.rows });
  } catch (error) {
    console.error('Failed to load AI messages:', error);
    res.status(500).json({ error: 'Failed to load this destination chat.' });
  }
});

router.post('/chats/:country/:city/messages', async (req, res) => {
  const country = titleCasePlace(req.params.country);
  const city = titleCasePlace(req.params.city);
  const itineraryId = req.body.itinerary_id ? Number(req.body.itinerary_id) : (req.query.itineraryId ? Number(req.query.itineraryId) : null);
  const userMessage = String(req.body.message || '').trim();

  if (!userMessage) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  try {
    const chat = await ensureDestinationChat(req.user.uid, { country, city, itineraryId });

    await pool.query(
      `INSERT INTO core.ai_messages (chat_id, role, content) VALUES ($1, 'user', $2)`,
      [chat.id, userMessage]
    );

    const historyResult = await pool.query(
      `SELECT role, content
       FROM core.ai_messages
       WHERE chat_id = $1
       ORDER BY created_at ASC
       LIMIT 40`,
      [chat.id]
    );

    const history = historyResult.rows.slice(0, -1);

    let firstName = '';
    try {
      const nameRow = await fetchUserName(req.user.uid);
      firstName = nameRow?.first_name || '';
    } catch (error) {
      console.error('Failed to load traveler name:', error);
    }

    let assistantMessage;
    try {
      const reply = await askTravelGuide({
        country: chat.country,
        city: chat.city,
        itineraryId: chat.itinerary_id,
        history,
        userMessage,
        firstName,
      });
      assistantMessage = reply.content;
    } catch (error) {
      if (error.code === 'MISSING_API_KEY') {
        assistantMessage =
          'Ask Leo is ready once a free Gemini key is added. Put GEMINI_API_KEY in the web-app .env file, restart the server, and ask again.';
      } else {
        console.error('Ask Leo request failed:', error);
        assistantMessage = city
          ? `I'm tied up for a moment. Ask again in a minute and I'll help you plan ${city}.`
          : "I'm tied up for a moment. Ask again in a minute and I'll help you plan.";
      }
    }

    const saved = await pool.query(
      `INSERT INTO core.ai_messages (chat_id, role, content)
       VALUES ($1, 'assistant', $2)
       RETURNING id, role, content, created_at`,
      [chat.id, assistantMessage]
    );

    await pool.query(`UPDATE core.ai_chats SET updated_at = NOW() WHERE id = $1`, [chat.id]);

    res.status(201).json({
      chat,
      assistant: saved.rows[0],
    });
  } catch (error) {
    console.error('Failed to send AI message:', error);
    res.status(500).json({ error: 'Failed to send that message.' });
  }
});

router.delete('/chats/:country/:city', async (req, res) => {
  const country = titleCasePlace(req.params.country);
  const city = titleCasePlace(req.params.city);

  try {
    const removed = await deleteDestinationChat(req.user.uid, country, city);
    if (!removed) {
      return res.status(404).json({ error: 'Chat not found.' });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete AI chat:', error);
    res.status(500).json({ error: 'Failed to delete that city chat.' });
  }
});

module.exports = router;
