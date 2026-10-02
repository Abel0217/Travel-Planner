import raw from '../data/airports.json';

// Every airport with scheduled flights (about 4,000), searchable offline by code, city or name.
const fold = (text) => String(text || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const airports = raw.map(([code, name, city, country, size, lat, lng]) => ({
  code,
  name,
  city: city || '',
  country,
  size,
  lat,
  lng,
  codeKey: code.toLowerCase(),
  cityKey: fold(city),
  nameKey: fold(name),
}));

let regionNames = null;
export const countryName = (iso) => {
  try {
    if (!regionNames) regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    return regionNames.of(iso) || iso;
  } catch (error) {
    return iso;
  }
};

export const airportLabel = (airport) => `${airport.name} (${airport.code})`;
export const airportPlace = (airport) => [airport.city, countryName(airport.country)].filter(Boolean).join(', ');

const score = (airport, query) => {
  let points = 0;
  if (airport.codeKey === query) points = 100;
  else if (airport.cityKey === query) points = 60;
  else if (airport.cityKey.startsWith(query)) points = 50;
  else if (airport.nameKey.split(/[\s-]+/).some((word) => word.startsWith(query))) points = 40;
  else if (query.length >= 3 && airport.codeKey.startsWith(query)) points = 30;
  else if (query.length >= 3 && (airport.cityKey.includes(query) || airport.nameKey.includes(query))) points = 20;
  if (points === 0) return 0;
  return points + (2 - airport.size) * 5;
};

// "yyz", "toronto", "heathrow", "rio de janeiro" all work.
export function searchAirports(text, limit = 8) {
  const query = fold(text);
  if (query.length < 2) return [];
  return airports
    .map((airport) => ({ airport, points: score(airport, query) }))
    .filter((row) => row.points > 0)
    .sort((a, b) => b.points - a.points || a.airport.name.localeCompare(b.airport.name))
    .slice(0, limit)
    .map((row) => row.airport);
}

// Turns "Toronto Pearson International Airport (YYZ)" back into an airport, if it is one.
export function airportFromLabel(text) {
  const code = String(text || '').match(/\(([A-Za-z]{3})\)\s*$/);
  if (!code) return null;
  return airports.find((airport) => airport.codeKey === code[1].toLowerCase()) || null;
}
