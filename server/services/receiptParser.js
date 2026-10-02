const CATEGORIES = ['flight', 'hotel', 'restaurant', 'activity', 'transport', 'other'];

const CATEGORY_RULES = [
  ['flight', /\b(flight|airline|boarding\s*pass|airport|airfare|air\s*canada|westjet|delta|united\s+air)\b/i],
  ['hotel', /\b(hotel|motel|check-?\s*in|check-?\s*out|resort|airbnb|lodging|hostel)\b/i],
  ['transport', /\b(uber|lyft|taxi|cab\b|transit|metro|subway|train\s*ticket|rental\s*car|gas\s*station|\bfuel\b|parking)\b/i],
  ['activity', /\b(game\s*pass|[gq]?ame\s*pass|admission|museum|tour|arcade|bowling|cinema|movie|attraction|amusement|zoo|aquarium|ticket|escape\s*room|concert|theatre|theater)\b/i],
  ['restaurant', /\b(restaurant|cafe|caf[eé]|coffee|diner|grill|bistro|pizza|burger|sushi|menu|appetizer|entree|entr[eé]e|lunch|dinner|breakfast|brunch|kitchen|bakery|food|beverage|tip)\b/i],
];

const TITLE_SKIP = /\b(phone|server|receipt|sub\s*-?\s*total|grand\s*total|\btotal\b|hst|gst|pst|vat|\btax\b|round\s*\d|time|date|table|guest|visa|mastercard|amex|debit|change|tender|cash|subtotal|open\s*time|thank|balance|amount\s*due|new\s*card|game\s*pass)\b|\b(st|street|ave|avenue|rd|road|blvd|drive|dr|yonge)\b\.?/i;

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function normalizeMoney(raw) {
  let text = String(raw || '').trim().replace(/[^\d.,]/g, '');
  if (!text) return null;
  if (text.includes(',') && text.includes('.')) {
    text = text.lastIndexOf(',') > text.lastIndexOf('.')
      ? text.replace(/\./g, '').replace(',', '.')
      : text.replace(/,/g, '');
  } else if (text.includes(',')) {
    text = /,\d{2}$/.test(text) ? text.replace(',', '.') : text.replace(/,/g, '');
  }
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 100000) return null;
  return roundMoney(amount);
}

function moneyValues(line) {
  const found = [];
  const withCents = /\$?\s*(\d{1,6}[.,]\d{2})/g;
  let match = withCents.exec(line);
  while (match) {
    const amount = normalizeMoney(match[1]);
    if (amount != null) found.push(amount);
    match = withCents.exec(line);
  }
  const dollars = /\$\s*(\d{1,5})(?![\d.,])/g;
  match = dollars.exec(line);
  while (match) {
    const amount = normalizeMoney(match[1]);
    if (amount != null) found.push(amount);
    match = dollars.exec(line);
  }
  return found;
}

function linesOf(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function lineKind(line) {
  if (/\bsub\s*-?\s*total\b/i.test(line)) return 'subtotal';
  const withoutSubtotal = line.replace(/sub\s*-?\s*totals?/ig, ' ');
  if (/\bgrand\s*total\b/i.test(withoutSubtotal)) return 'grand';
  if (/\b(balance|amount)\s*due\b|\btotal\s*due\b/i.test(withoutSubtotal)) return 'total';
  if (/\b(hst|gst|pst|qst|vat|sales\s*tax|\btax\b|tip|gratuity)\b/i.test(withoutSubtotal)) return 'tax';
  if (/\btotal\b/i.test(withoutSubtotal)) return 'total';
  return '';
}

function aboveSubtotal(amount, subtotal) {
  return subtotal == null || amount > subtotal + 0.009;
}

function extractTotal(lines) {
  const labeled = [];
  const loneAmounts = [];

  lines.forEach((line, index) => {
    const kind = lineKind(line);
    const amounts = moneyValues(line).filter((amount, position, list) => list.indexOf(amount) === position);
    if (kind && amounts.length) {
      labeled.push({ kind, amounts, index });
    } else if (kind) {
      labeled.push({ kind, amounts: [], index });
    } else if (/^\$?\s*\d{1,6}(?:[.,]\d{2})\s*$/.test(line)) {
      const amount = normalizeMoney(line);
      if (amount != null) loneAmounts.push({ amount, index });
    }
  });

  const subtotal = [...labeled].reverse().find((item) => item.kind === 'subtotal' && item.amounts.length);
  const subtotalAmount = subtotal ? subtotal.amounts[subtotal.amounts.length - 1] : null;
  const taxAmounts = labeled
    .filter((item) => item.kind === 'tax')
    .flatMap((item) => item.amounts)
    .filter((amount) => subtotalAmount == null || Math.abs(amount - subtotalAmount) > 0.02);
  const computed = subtotalAmount != null && taxAmounts.length
    ? roundMoney(subtotalAmount + taxAmounts.reduce((sum, amount) => sum + amount, 0))
    : null;

  const explicitTotals = labeled
    .filter((item) => (item.kind === 'total' || item.kind === 'grand') && item.amounts.length)
    .map((item) => item.amounts.filter((amount) => aboveSubtotal(amount, subtotalAmount)).pop())
    .filter((amount) => amount != null);

  if (explicitTotals.length) {
    return { amount: explicitTotals[explicitTotals.length - 1], confidence: 'labeled' };
  }

  if (computed != null && aboveSubtotal(computed, subtotalAmount)) {
    return { amount: computed, confidence: 'computed' };
  }

  if (subtotalAmount != null) {
    const bigger = [];
    lines.forEach((line) => {
      moneyValues(line).forEach((amount) => {
        if (aboveSubtotal(amount, subtotalAmount)) bigger.push(amount);
      });
    });
    if (bigger.length) return { amount: bigger[bigger.length - 1], confidence: 'labeled' };
  }

  const grand = labeled.filter((item) => item.kind === 'grand' && item.amounts.length);
  if (grand.length) return { amount: grand[grand.length - 1].amounts.pop(), confidence: 'labeled' };

  const totalLabel = [...labeled].reverse().find((item) => item.kind === 'total');
  if (totalLabel && loneAmounts.length) {
    const after = loneAmounts.filter((item) => item.index >= totalLabel.index && aboveSubtotal(item.amount, subtotalAmount));
    if (after.length) return { amount: after[after.length - 1].amount, confidence: 'labeled' };
  }

  return { amount: undefined, confidence: 'none' };
}

function validDate(year, month, day) {
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.getFullYear() === Number(year)
    && date.getMonth() === Number(month) - 1
    && date.getDate() === Number(day);
}

function extractDate(text) {
  const iso = String(text || '').match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso && validDate(iso[1], iso[2], iso[3])) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const loose = String(text || '').match(/\b(20\d{2})[\s./-]+(\d{1,2})[\s./-]+(\d{1,2})\b/);
  if (loose && validDate(loose[1], loose[2], loose[3])) {
    return `${loose[1]}-${String(loose[2]).padStart(2, '0')}-${String(loose[3]).padStart(2, '0')}`;
  }

  const slash = String(text || '').match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})\b/);
  if (slash) {
    const month = slash[1].padStart(2, '0');
    const day = slash[2].padStart(2, '0');
    if (validDate(slash[3], month, day)) return `${slash[3]}-${month}-${day}`;
    if (validDate(slash[3], day, month)) return `${slash[3]}-${day}-${month}`;
  }

  const months = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const named = String(text || '').match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(20\d{2})\b/i);
  if (named && validDate(named[3], months[named[1].toLowerCase()], named[2])) {
    return `${named[3]}-${months[named[1].toLowerCase()]}-${String(named[2]).padStart(2, '0')}`;
  }
  return undefined;
}

function cleanTitle(line) {
  const text = String(line || '').replace(/^[#*\-\d.\s]+/, '').replace(/\s+/g, ' ').trim();
  if (text.length < 3 || text.length > 48) return '';
  const words = text.match(/[A-Za-z][A-Za-z'&.-]{1,}/g) || [];
  if (!words.some((word) => word.length >= 4)) return '';
  const cleaned = words.join(' ');
  if (TITLE_SKIP.test(cleaned) || /\d{3,}/.test(text)) return '';
  if (/[a-z]/.test(cleaned) && /[A-Z]/.test(cleaned)) return cleaned;
  return cleaned.toLowerCase().replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function extractTitle(lines) {
  for (const line of lines.slice(0, 8)) {
    const title = cleanTitle(line);
    if (title) return title;
  }
  for (const line of lines) {
    const title = cleanTitle(line);
    if (title) return title;
  }
  return undefined;
}

function extractCategory(text) {
  let best = 'other';
  let bestScore = 0;
  CATEGORY_RULES.forEach(([category, pattern]) => {
    const hits = String(text || '').match(new RegExp(pattern.source, 'gi'));
    const score = hits ? hits.length : 0;
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  });
  return best;
}

function normalizeCategory(value) {
  const raw = String(value || '').toLowerCase().trim();
  if (raw === 'food' || raw === 'dining' || raw === 'meal') return 'restaurant';
  return CATEGORIES.includes(raw) ? raw : '';
}

function normalizeDate(value) {
  return extractDate(String(value || '')) || undefined;
}

function parseReceipt(text) {
  const lines = linesOf(text);
  const total = extractTotal(lines);
  const title = extractTitle(lines);
  return {
    title,
    merchant: title,
    amount: total.amount,
    amountConfidence: total.confidence,
    expenseDate: extractDate(text),
    category: extractCategory(text),
  };
}

function scoreReceiptText(text) {
  const value = String(text || '');
  let score = 0;
  if (/\bgrand\s*total\b|\btotal\b/i.test(value)) score += 5;
  if (/\bsub\s*-?\s*total\b/i.test(value)) score += 3;
  if (/\b(hst|gst|tax)\b/i.test(value)) score += 2;
  if (/\b20\d{2}-\d{2}-\d{2}\b/.test(value)) score += 3;
  const amounts = value.match(/\d{1,5}[.,]\d{2}/g) || [];
  score += Math.min(amounts.length, 6);
  const words = value.match(/[A-Za-z]{4,}/g) || [];
  score += Math.min(words.length, 12) * 0.35;
  const letters = (value.match(/[A-Za-z]/g) || []).length;
  if (letters < 12) score -= 4;
  return score;
}

function mergeExpenseFields(heuristic, ai) {
  const parsed = heuristic || {};
  const smart = ai || {};
  const fields = {};

  const aiTitle = cleanTitle(smart.title) || cleanTitle(smart.merchant);
  fields.title = aiTitle || parsed.title;
  fields.merchant = fields.title;

  const trustedAmount = parsed.amountConfidence === 'labeled' || parsed.amountConfidence === 'computed';
  const aiAmount = normalizeMoney(smart.amount);
  if (trustedAmount && parsed.amount) fields.amount = parsed.amount;
  else if (aiAmount != null) fields.amount = aiAmount;
  else if (parsed.amount) fields.amount = parsed.amount;

  fields.expenseDate = normalizeDate(smart.expenseDate) || parsed.expenseDate;

  const aiCategory = normalizeCategory(smart.category);
  const localCategory = parsed.category && parsed.category !== 'other' ? parsed.category : '';
  fields.category = localCategory || aiCategory || parsed.category || 'other';

  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

module.exports = {
  parseReceipt,
  scoreReceiptText,
  mergeExpenseFields,
  normalizeCategory,
  normalizeDate,
};
