const path = require('path');
const fs = require('fs');
const { extractFlightDetails } = require('../parsers/FlightParser');
const { extractHotelDetails } = require('../parsers/HotelParser');
const { extractTransportDetails } = require('../parsers/TransportParser');
const { extractActivityDetails } = require('../parsers/ActivityParser');
const { extractRestaurantDetails } = require('../parsers/RestaurantParser');
const { parseReceipt, scoreReceiptText, mergeExpenseFields } = require('./receiptParser');
const { isoDate, time24, countFields } = require('../parsers/fieldUtils');

const FIELD_GUIDES = {
  flight: 'airline, flightNumber, departureAirport, arrivalAirport, departureDate (YYYY-MM-DD), departureTime (HH:mm), arrivalDate, arrivalTime, bookingReference, passengerName, seatNumber, amount',
  hotel: 'hotelName, address, checkInDate (YYYY-MM-DD), checkOutDate (YYYY-MM-DD), bookingConfirmation, amount',
  restaurant: 'restaurantName, address, reservationDate (YYYY-MM-DD), reservationTime (HH:mm), guestNumber, bookingConfirmation, amount',
  activity: 'title, location, activityDate (YYYY-MM-DD), startTime, endTime, reservationNumber, description, amount',
  transport: 'type, pickupLocation, dropoffLocation, pickupTime, dropoffTime, bookingReference, amount',
  expense: 'title (business or place name), amount (final total due, never subtotal, tax, or a single line item), expenseDate (YYYY-MM-DD), category (flight|hotel|restaurant|activity|transport|other), merchant',
};

function heuristicParse(bookingType, text) {
  switch (bookingType) {
    case 'flight':
      return extractFlightDetails(text);
    case 'hotel':
      return extractHotelDetails(text);
    case 'transport':
      return extractTransportDetails(text);
    case 'activity':
      return extractActivityDetails(text);
    case 'restaurant':
      return extractRestaurantDetails(text);
    case 'expense':
      return parseReceipt(text);
    default:
      return {};
  }
}

function compact(details) {
  return Object.fromEntries(
    Object.entries(details || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

async function extractTextFromPdfBuffer(buffer) {
  const pdfParse = require('pdf-parse');
  const result = await pdfParse(buffer);
  return result.text || '';
}

async function preparedTurns(buffer) {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (error) {
    return [{ plain: buffer, wide: buffer }];
  }

  const upright = sharp(buffer, { failOn: 'none' }).rotate();
  const turns = [];
  for (const angle of [0, 90, 270, 180]) {
    const turned = upright.clone().rotate(angle);
    turns.push({
      plain: await turned.clone().jpeg({ quality: 95 }).toBuffer(),
      wide: await turned.clone().resize({ width: 2000, withoutEnlargement: false }).grayscale().normalise().jpeg({ quality: 95 }).toBuffer(),
    });
  }
  return turns;
}

function polishBookingFields(type, fields) {
  const next = { ...fields };
  const dateKeys = {
    flight: ['departureDate', 'arrivalDate'],
    hotel: ['checkInDate', 'checkOutDate'],
    restaurant: ['reservationDate'],
    activity: ['activityDate'],
  }[type] || [];
  const timeKeys = {
    flight: ['departureTime', 'arrivalTime'],
    restaurant: ['reservationTime'],
    activity: ['startTime', 'endTime'],
  }[type] || [];

  dateKeys.forEach((key) => {
    if (next[key]) next[key] = isoDate(String(next[key])) || next[key];
  });
  timeKeys.forEach((key) => {
    if (next[key]) next[key] = time24(String(next[key])) || next[key];
  });
  return compact(next);
}

async function recognizeBestImage(buffer, bookingType) {
  const Tesseract = require('tesseract.js');
  const images = await preparedTurns(buffer);
  const worker = await Tesseract.createWorker('eng');
  let best = { text: '', score: -1, buffer: images[0].plain };
  try {
    for (const item of images) {
      await worker.setParameters({ tessedit_pageseg_mode: '11' });
      const sparse = await worker.recognize(item.plain);
      await worker.setParameters({ tessedit_pageseg_mode: '6' });
      const block = await worker.recognize(item.wide);
      const text = `${block.data?.text || ''}\n${sparse.data?.text || ''}`;
      const parsed = bookingType === 'expense' ? parseReceipt(text) : heuristicParse(bookingType, text);
      const quality = bookingType === 'expense'
        ? (parsed.amountConfidence === 'labeled' ? 24 : parsed.amount ? 8 : 0)
          + (parsed.expenseDate ? 6 : 0)
          + (parsed.title ? 6 : 0)
          + (parsed.category && parsed.category !== 'other' ? 4 : 0)
          + scoreReceiptText(text)
        : countFields(parsed) * 10 + Math.min(text.trim().length, 400) / 80;
      if (quality > best.score) best = { text, score: quality, buffer: item.wide, parsed };
      if (bookingType === 'expense' && parsed.amountConfidence === 'labeled' && parsed.expenseDate && parsed.title) break;
      if (bookingType !== 'expense' && countFields(parsed) >= 4) break;
    }
  } finally {
    await worker.terminate();
  }
  return best;
}

async function extractTextFromImageBuffer(buffer, bookingType) {
  try {
    const vision = require('./visionIntegration');
    const text = await vision.extractTextFromImage(buffer);
    if (text && scoreReceiptText(text) >= 12 && parseReceipt(text).amount) {
      return { text, buffer };
    }
  } catch (error) {
    console.warn('Google Vision OCR unavailable:', error.message);
  }

  try {
    return await recognizeBestImage(buffer, bookingType || 'expense');
  } catch (error) {
    console.warn('Tesseract OCR unavailable:', error.message);
    return { text: '', buffer };
  }
}

async function extractWithClaude({ bookingType, text, imageBase64, mimeType }) {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const content = [];

  if (imageBase64 && mimeType && mimeType.startsWith('image/')) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: mimeType, data: imageBase64 },
    });
  }

  content.push({
    type: 'text',
    text: `Read this ${bookingType} document. Receipts are often rotated, so use the image itself.
For an expense receipt:
- title is the business or place name, not a street, phone, receipt number, or line item
- amount is the final Total / Grand Total / amount due. Never use the subtotal, tax, or one item
- expenseDate is the purchase date as YYYY-MM-DD
- category is flight, hotel, restaurant, activity, transport, or other
  restaurant means meals or drinks
  activity means tickets, games, tours, attractions, or entertainment
  transport means rides, transit, or fuel
  hotel means lodging
  flight means airfare
Return ONLY valid JSON with these keys when present: ${FIELD_GUIDES[bookingType] || FIELD_GUIDES.expense}.
Use null for unknown values. Do not invent details.
OCR text (may be messy):\n${text || '(no OCR text)'}`,
  });

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: 800,
    system: 'You extract structured travel booking data. Reply with JSON only.',
    messages: [{ role: 'user', content }],
  });

  const raw = response.content.filter((block) => block.type === 'text').map((block) => block.text).join('\n');
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  return JSON.parse(jsonMatch[0]);
}

async function parseBookingFile({ buffer, mimetype, originalname, bookingType }) {
  const type = (bookingType || 'expense').toLowerCase();
  let text = '';
  let imageBuffer = buffer;

  if (mimetype === 'application/pdf' || (originalname || '').toLowerCase().endsWith('.pdf')) {
    text = await extractTextFromPdfBuffer(buffer);
  } else if ((mimetype || '').startsWith('image/')) {
    const read = await extractTextFromImageBuffer(buffer, type);
    text = read.text || '';
    imageBuffer = read.buffer || buffer;
  } else {
    throw Object.assign(new Error('Please upload a PDF or image (PNG, JPG, WEBP).'), { status: 400 });
  }

  const heuristic = compact(heuristicParse(type, text));
  let ai = {};
  try {
    const imageBase64 = (mimetype || '').startsWith('image/') ? imageBuffer.toString('base64') : null;
    ai = compact(await extractWithClaude({
      bookingType: type,
      text,
      imageBase64,
      mimeType: imageBase64 ? 'image/jpeg' : mimetype,
    }) || {});
  } catch (error) {
    console.warn('Claude parse skipped:', error.message);
  }

  const fields = type === 'expense'
    ? mergeExpenseFields(heuristic, ai)
    : polishBookingFields(type, { ...heuristic, ...ai });
  const filled = Object.keys(fields).length;

  return {
    fields,
    ocrText: text.slice(0, 4000),
    source: ai && Object.keys(ai).length ? 'ai+ocr' : 'ocr',
    message: filled
      ? 'Review the filled fields, then save.'
      : 'Could not read much from that file. Try a clearer screenshot or type the details.',
  };
}

function ensureUploadDir(subdir) {
  const dir = path.join(__dirname, '..', 'uploads', subdir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

module.exports = {
  parseBookingFile,
  ensureUploadDir,
};
