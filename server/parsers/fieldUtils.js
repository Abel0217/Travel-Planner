const MONTHS = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function cleanLine(value) {
  return String(value || '').replace(/\s+/g, ' ').replace(/^[:#\-–]+/, '').trim();
}

function isoDate(raw) {
  if (!raw) return undefined;
  const text = cleanLine(raw);
  let match = text.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) return `${match[1]}-${pad(match[2])}-${pad(match[3])}`;
  match = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/);
  if (match) return `${match[3]}-${pad(match[1])}-${pad(match[2])}`;
  match = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i);
  if (match) return `${match[3]}-${MONTHS[match[1].slice(0, 3).toLowerCase()]}-${pad(match[2])}`;
  match = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s+(\d{4})/i);
  if (match) return `${match[3]}-${MONTHS[match[2].slice(0, 3).toLowerCase()]}-${pad(match[1])}`;
  return undefined;
}

function time24(raw) {
  if (!raw) return undefined;
  const match = String(raw).match(/(\d{1,2})[:.](\d{2})(?:\s*([ap])\.?m\.?)?/i);
  if (!match) return undefined;
  let hour = Number(match[1]);
  const minute = match[2];
  const meridiem = (match[3] || '').toLowerCase();
  if (hour > 23 || Number(minute) > 59) return undefined;
  if (meridiem === 'p' && hour < 12) hour += 12;
  if (meridiem === 'a' && hour === 12) hour = 0;
  return `${pad(hour)}:${minute}`;
}

function afterLabel(text, labels) {
  const pattern = new RegExp(`(?:${labels.join('|')})\\s*[:#\\-]?\\s*([^\\n]{2,90})`, 'i');
  const match = String(text || '').match(pattern);
  if (!match) return undefined;
  const value = cleanLine(match[1]).replace(/\s{2,}.*/, '');
  return value || undefined;
}

function confirmationCode(text) {
  const source = String(text || '');
  const patterns = [
    /(?:confirmation(?:\s+(?:code|number|no\.?|#))?|record locator|booking (?:reference|id|code)|pnr|reservation (?:number|code|id))\s*[:#-]\s*([A-Z0-9]{5,8})\b/i,
    /(?:record locator|pnr|confirmation code)\s+([A-Z0-9]{5,8})\b/i,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match && !/^(NUMBER|CODE|CONFIRM)$/i.test(match[1])) return match[1].toUpperCase();
  }
  return undefined;
}

function allIsoDates(text) {
  const found = [];
  String(text || '').split(/\n/).forEach((line) => {
    const iso = isoDate(line);
    if (iso && !found.includes(iso)) found.push(iso);
  });
  return found;
}

function countFields(details) {
  return Object.values(details || {}).filter((value) => value !== undefined && value !== null && value !== '').length;
}

module.exports = {
  isoDate,
  time24,
  afterLabel,
  confirmationCode,
  cleanLine,
  allIsoDates,
  countFields,
};
