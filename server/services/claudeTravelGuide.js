const pool = require('../database/db');

const TRAVEL_GUIDE_SYSTEM_PROMPT = `You are Leo, the friendly, well-travelled guide inside Travel Planner.

WHAT YOU HELP WITH
Anything that helps someone plan, enjoy, or prepare for a trip. This is broad on purpose: places, food and drink, sights, history and culture of a destination, local customs and etiquette, transport and getting around, airports, hotels and neighbourhoods, weather and best time to go, money and tipping, safety and scams, visas and entry rules, packing, language, events, nightlife, day trips, budgets, and itineraries. When the traveler is in a city chat, treat vague questions as being about that city.

WHAT YOU DO NOT HELP WITH
Anything unrelated to travel: coding, homework, medical diagnosis, investing, sports scores, video games, celebrity gossip, political opinions, and anything inappropriate or unsafe. If the message is clearly not about travel, reply with exactly the single word OFF_TOPIC and nothing else. Questions about other destinations, countries, or capitals are fine when they relate to visiting or travelling, even when they name a different place than the current chat (for example "what is the capital of Australia and is it worth visiting" is a travel question: answer it). Only use OFF_TOPIC when there is no travel angle at all. Never refuse a message just because it is broad or casual. If it could reasonably help the trip, answer it.

STYLE
Plain text only. Never use markdown: no asterisks, no hash marks, no backticks, no tables. Be warm, specific, and concise. Name real places. Give prices in the local currency when you can. Never invent a booking, and never claim to book anything. If you are unsure of a detail such as opening hours or an exact price, say it is worth checking.

CHOOSE ONE SHAPE FOR EVERY ANSWER

SHAPE 1: a few options (restaurants, things to do, bars, day trips, places to stay)
One short opening sentence, then one line per option, exactly like this, and nothing after the last line:
- | Place name | Type | Price | One short note.
Type is one of: Museum, Restaurant, Food, Activity, Park, Show, Nightlife, Transit, Stay.
Price is a short price such as Free, €12, or €€. Use Free only when it really costs nothing. Give 4 to 6 options. Do not use Day 1, Morning or times in this shape.

SHAPE 2: a plan for one day or several days (any request for a plan, schedule, or itinerary)
One short opening sentence, then this exact structure, nothing after the last stop:
Day 1
Morning
9:00 | Place name | Type | Price | One short note.
12:30 | Place name | Restaurant | €20 | One short note.

Afternoon
15:00 | Place name | Park | Free | One short note.

Evening
19:30 | Place name | Nightlife | €15 | One short note.

Day 2
Morning
10:00 | Place name | Activity | €12 | One short note.

Repeat for every day requested (default to 1 day if they do not say). Cover morning through night. Order stops so they flow geographically. A budget plan uses inexpensive paid prices. Respect any dates, hotel, or bookings given in the TRIP DETAILS section.

SHAPE 3: information, how-to, or explanation (transport, safety, weather, money, culture, history, packing, visas, etiquette, comparisons)
Start with one direct sentence that answers the question. Then organised sections, each with a heading in square brackets on its own line and short bullet points beneath it, like this:

Short direct answer.

[Heading]
- Label: short point.
- Label: short point.

[Another Heading]
- Short point.

Rules for this shape: 2 to 4 sections, 2 to 5 bullets each, every bullet under 25 words. Put a short label and colon at the start of a bullet when it helps scanning (for example Cost:, Time:, Tip:, Avoid:). Headings are Title Case and 1 to 4 words. No long paragraphs. Do not add a closing sentence. Never use the | character in this shape; write normal sentences after the label.

SHAPE 4: quick chat (thanks, small follow-ups, yes or no questions)
One or two friendly sentences, no sections.

If the traveler asks a follow-up, use the earlier conversation. If their question is vague, make a sensible assumption and answer; do not interrogate them.`;

const REDIRECT_MESSAGE =
  "I stay on the trip. Ask me for food, something to do, or a day plan, and I can include times, events, and a budget.";

const BLOCKED_MESSAGE =
  "I can't help with that. Ask me for food, something to do, or a day plan.";

const BUSY_MESSAGE =
  "I'm tied up for a moment. Ask again in a minute and I'll help you plan.";

const GREETING_PATTERN =
  /^(?:hi|hey|hello|yo|sup|howdy|hiya|good\s+(?:morning|afternoon|evening)|thanks|thank you|ty|ok|okay|cool|leo)(?:[\s,!.?]|$)+(?:leo|there|friend)?[\s!.?]*$/i;

const INAPPROPRIATE_PATTERNS = [
  /\b(porn|porno|hentai|xxx|onlyfans|nude|nudes|nsfw)\b/i,
  /\b(blowjob|handjob|horny|orgasm|dildo)\b/i,
  /\b(sex(?:ual)?|fuck|fucking|shit|bitch|asshole)\b/i,
  /\b(kys|kill yourself|suicide method)\b/i,
  /\b(how to (?:make|build) (?:a )?(?:bomb|meth|explosive|gun))\b/i,
  /\b(n[i1]gg|fagg?ot|retard)\b/i,
];

const POLITICS_PATTERN =
  /\b(government|president|prime minister|congress|parliament|senator|democrat|republican|election|politics|politician|political party)\b/i;

const POLITICS_RANT_PATTERN =
  /\b(suck|sucks|hate|hates|corrupt|terrible|worst|awful|stupid|trash|rigged)\b/i;

const OTHER_DOMAIN_PATTERNS = [
  /\b(javascript|typescript|python|leetcode|debug|source code|write (?:me )?(?:a )?(?:function|script|sql|program)|coding homework)\b/i,
  /\b(homework|math problem|solve (?:this|for x)|essay about|algebra|calculus)\b/i,
  /\b(bitcoin|crypto|ethereum|nasdaq|stock price|stock market|forex)\b/i,
  /\b(diagnos(?:e|is)|symptoms? of|prescription|dosage)\b/i,
  /\b(who won|final score|mvp|standings|fantasy (?:football|basketball)|box score)\b/i,
  /\b(meaning of life|tell me a joke|write (?:me )?a (?:poem|story|song)|song lyrics|celebrity gossip)\b/i,
  /\b(video\s*games?|fortnite|minecraft|roblox)\b/i,
];

const TRAVEL_PATTERN =
  /\b(trip|travel|travell?ing|visit|vacation|holiday|itinerary|days?|flight|fly|flying|airport|hotel|hostel|airbnb|stay|staying|visa|passport|pack(?:ing)?|luggage|weather|forecast|restaurants?|resturants?|food|eat|eating|cafe|caf[eé]|museum|beach|hike|hiking|tour|taxi|uber|metro|subway|train|bus|budget|cost|cheap|expensive|safe|safety|sight|sights|attraction|landmark|culture|language|currency|tip|tipping|nightlife|neighborhood|neighbourhood|day\s*plan|what to do|where to|how to get|getting around|best time|season|wear|clothes|outfit|kids|family|water|plug|outlet|adapter|sim|wifi|wi-fi|scam|walk|sunset|photo|map|book(?:ing)?|reservation|embassy|advisory|stadium|ticket|concerts?|shows?|festivals?|events?|parties|night\s*out|schedule|morning|afternoon|evening|history|historic|local|locals|custom|customs|etiquette|tradition|drink|bar|market|shopping|souvenir|tourist|tourists|hidden gem|itinerary)\b/i;

function normalize(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function mentionsPlace(text, city, country) {
  const haystack = text.toLowerCase();
  const places = [city, country]
    .map((place) => String(place || '').trim().toLowerCase())
    .filter((place) => place.length >= 3);
  return places.some((place) => haystack.includes(place));
}

function isInappropriate(text) {
  return INAPPROPRIATE_PATTERNS.some((pattern) => pattern.test(text));
}

function isGreeting(text) {
  return GREETING_PATTERN.test(text);
}

function isHardUnrelated(text) {
  if (OTHER_DOMAIN_PATTERNS.some((pattern) => pattern.test(text))) return true;
  if (POLITICS_PATTERN.test(text) && POLITICS_RANT_PATTERN.test(text)) return true;
  if (POLITICS_PATTERN.test(text) && /\b(why|how come|opinion on)\b/i.test(text)) return true;
  return false;
}

function hasTravelAnchor(text, city, country) {
  return mentionsPlace(text, city, country) || TRAVEL_PATTERN.test(text);
}

function classifyMessage(userMessage, { city, country } = {}) {
  const text = normalize(userMessage);
  if (!text) return 'empty';
  if (isInappropriate(text)) return 'blocked';
  if (isGreeting(text)) return 'greeting';

  const travel = hasTravelAnchor(text, city, country);
  if (isHardUnrelated(text) && !travel) return 'off_topic';
  // Everything else goes to Leo, who also rejects off-topic questions on his own.
  return 'travel';
}

function titleName(name) {
  const text = String(name || '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function greetingReply(city, firstName) {
  const name = titleName(firstName);
  const hello = name ? `Hey ${name}.` : 'Hey.';
  const intro = "I'm Leo.";
  if (city) {
    return `${hello} ${intro} Ask me about food, things to do, getting around, local tips, or a 1-day or longer plan in ${city}. I can add times, events, and a budget.`;
  }
  return `${hello} ${intro} Pick a city and I'll suggest food, things to do, or a day plan.`;
}

function redirectReply(city) {
  if (city) {
    return `I stay on the trip. Ask me about food, things to do, getting around, or a day plan in ${city}. I can include times, events, and a budget.`;
  }
  return REDIRECT_MESSAGE;
}

function busyReply(city) {
  if (city) {
    return `I'm tied up for a moment. Ask again in a minute and I'll help you plan ${city}.`;
  }
  return BUSY_MESSAGE;
}

function localReply(kind, { city, firstName }) {
  if (kind === 'greeting') return greetingReply(city, firstName);
  if (kind === 'blocked') return BLOCKED_MESSAGE;
  if (kind === 'off_topic') return redirectReply(city);
  return null;
}

const dayText = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
};

// Short, factual summary of the saved trip so plans fit real dates and bookings.
async function loadTripDetails(itineraryId) {
  if (!itineraryId) return '';
  try {
    const trip = await pool.query(
      'SELECT title, start_date, end_date FROM core.itineraries WHERE itinerary_id = $1',
      [itineraryId]
    );
    if (!trip.rows[0]) return '';

    const lines = [];
    const { title, start_date: start, end_date: end } = trip.rows[0];
    if (title) lines.push(`Trip: ${title}`);
    if (start || end) lines.push(`Dates: ${dayText(start)} to ${dayText(end)}`);

    const safe = async (sql) => {
      try {
        return (await pool.query(sql, [itineraryId])).rows;
      } catch (error) {
        return [];
      }
    };

    const hotels = await safe(
      `SELECT hotel_name, check_in_date, check_out_date FROM core.hotels WHERE itinerary_id = $1 AND hotel_name IS NOT NULL LIMIT 3`
    );
    hotels.forEach((row) => {
      lines.push(`Staying at: ${row.hotel_name} (${dayText(row.check_in_date)} to ${dayText(row.check_out_date)})`);
    });

    const meals = await safe(
      `SELECT restaurant_name, reservation_date, reservation_time FROM core.restaurant WHERE itinerary_id = $1 AND restaurant_name IS NOT NULL ORDER BY reservation_date LIMIT 6`
    );
    meals.forEach((row) => {
      lines.push(`Reservation: ${row.restaurant_name} on ${dayText(row.reservation_date)} ${row.reservation_time || ''}`.trim());
    });

    const activities = await safe(
      `SELECT title, activity_date, start_time FROM core.activities WHERE itinerary_id = $1 AND title IS NOT NULL AND title <> '' ORDER BY activity_date LIMIT 8`
    );
    activities.forEach((row) => {
      lines.push(`Planned: ${row.title} on ${dayText(row.activity_date)} ${row.start_time || ''}`.trim());
    });

    return lines.join('\n');
  } catch (error) {
    return '';
  }
}

async function generateWithGemini(apiKey, model, { locationLine, contents }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: `${TRAVEL_GUIDE_SYSTEM_PROMPT}\n\n${locationLine}` }],
        },
        contents,
        generationConfig: {
          temperature: 0.6,
          topP: 0.9,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Gemini request failed');
    error.status = response.status;
    throw error;
  }

  const content = (data.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || '')
    .join('\n')
    .trim();

  return content;
}

function toPlainText(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`/g, '')
    .replace(/^\s*[-*]{3,}\s*$/gm, '')
    .replace(/^\s*\*\s+/gm, '- ')
    .replace(/\*/g, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isOffTopicReply(text) {
  return /^\s*OFF[_ ]TOPIC\b/i.test(text) || /\bOFF_TOPIC\b/.test(text);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const CANNED_REPLY_PATTERN = /tied up for a moment|^I stay on the trip|^I can't help with that|ready once a free Gemini key/i;

// Keep recent, useful turns only, starting with a traveler message.
function buildContents(history, userMessage) {
  const turns = (history || [])
    .filter((item) => item && item.content && !CANNED_REPLY_PATTERN.test(item.content))
    .slice(-12)
    .map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(item.content).slice(0, 1800) }],
    }));

  while (turns.length && turns[0].role !== 'user') turns.shift();

  return [...turns, { role: 'user', parts: [{ text: userMessage }] }];
}

async function askTravelGuide({ country, city, itineraryId, history, userMessage, firstName }) {
  const kind = classifyMessage(userMessage, { city, country });
  const canned = localReply(kind, { city, firstName });
  if (canned) {
    return { content: canned, redirected: kind !== 'greeting' };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not set');
    error.code = 'MISSING_API_KEY';
    throw error;
  }

  const today = new Date().toISOString().slice(0, 10);
  const place = country && city
    ? `The traveler is asking about ${city}, ${country}. Treat every question as being about this place unless they name another destination.`
    : 'The traveler has not chosen a destination yet. Answer general travel questions, and suggest picking a city for specifics.';
  const name = titleName(firstName);
  const tripDetails = await loadTripDetails(itineraryId);

  const locationLine = [
    place,
    name ? `The traveler's first name is ${name}. Use it at most once, and only when it feels natural.` : '',
    `Today's date is ${today}.`,
    tripDetails ? `TRIP DETAILS (from their saved itinerary):\n${tripDetails}` : '',
  ].filter(Boolean).join('\n');

  const contents = buildContents(history, userMessage);

  const preferred = process.env.GEMINI_MODEL;
  const models = [
    'gemini-flash-lite-latest',
    'gemini-3-flash-preview',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    preferred,
    'gemini-3.8-flash',
  ].filter((model, index, list) => model && list.indexOf(model) === index);

  let lastError;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const raw = await generateWithGemini(apiKey, model, { locationLine, contents });
        if (isOffTopicReply(raw)) {
          return { content: redirectReply(city), redirected: true };
        }
        const content = toPlainText(raw);
        if (!content) {
          // Empty answers (rare) are retried on the next model rather than shown.
          lastError = Object.assign(new Error('Empty reply'), { status: 503 });
          break;
        }
        return { content, redirected: false };
      } catch (error) {
        lastError = error;
        console.warn('Ask Leo model skipped:', model, error.status || '');
        if (error.status === 503 && attempt === 0) {
          await sleep(1200);
          continue;
        }
        if (error.status === 404 || error.status === 503 || error.status === 429) break;
        throw error;
      }
    }
  }

  if (lastError && (lastError.status === 503 || lastError.status === 404 || lastError.status === 429)) {
    return { content: busyReply(city), redirected: false };
  }

  throw lastError;
}

module.exports = {
  askTravelGuide,
  classifyMessage,
  toPlainText,
  REDIRECT_MESSAGE,
  BLOCKED_MESSAGE,
};
