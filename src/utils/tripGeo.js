// Map helpers for the itinerary overview: cached geocoding, distances, and pin art.
import { GLYPHS } from '../features/Itinerary/components/overview/glyphs';

const CACHE_PREFIX = 'tp-geo:';
const memory = new Map();

const readCache = (query) => {
  if (memory.has(query)) return memory.get(query);
  try {
    const stored = window.sessionStorage.getItem(CACHE_PREFIX + query);
    if (stored) {
      const parsed = JSON.parse(stored);
      memory.set(query, parsed);
      return parsed;
    }
  } catch (error) {
    // storage can be unavailable; just skip the cache
  }
  return undefined;
};

const writeCache = (query, value) => {
  memory.set(query, value);
  try {
    window.sessionStorage.setItem(CACHE_PREFIX + query, JSON.stringify(value));
  } catch (error) {
    // ignore
  }
};

// ---- Which map is usable? Google needs billing; OpenStreetMap is the free fallback. ----
let googleBlocked = false;
const blockListeners = new Set();

export const isGoogleBlocked = () => googleBlocked;

export const markGoogleBlocked = () => {
  if (googleBlocked) return;
  googleBlocked = true;
  blockListeners.forEach((listener) => listener());
};

export const onGoogleBlocked = (listener) => {
  blockListeners.add(listener);
  return () => blockListeners.delete(listener);
};

if (typeof window !== 'undefined') {
  const previous = window.gm_authFailure;
  window.gm_authFailure = () => {
    markGoogleBlocked();
    if (typeof previous === 'function') previous();
  };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Asks Google one cheap question so a billing / key problem is noticed before the map is drawn.
let probeStarted = false;
export const probeGoogle = () => {
  if (probeStarted || googleBlocked) return;
  if (typeof window === 'undefined' || !window.google?.maps?.Geocoder) return;
  probeStarted = true;
  try {
    new window.google.maps.Geocoder().geocode({ address: 'Paris, France' }, (results, status) => {
      if (status === 'REQUEST_DENIED') markGoogleBlocked();
    });
  } catch (error) {
    markGoogleBlocked();
  }
};

const googleGeocodeOnce = (query, bias) => new Promise((resolve) => {
  const geocoder = new window.google.maps.Geocoder();
  const request = { address: query };
  if (bias && window.google.maps.LatLngBounds) {
    const span = 1.2;
    request.bounds = new window.google.maps.LatLngBounds(
      { lat: bias.lat - span, lng: bias.lng - span },
      { lat: bias.lat + span, lng: bias.lng + span }
    );
  }
  geocoder.geocode(request, (results, status) => {
    if (status === 'OK' && results?.[0]?.geometry?.location) {
      const location = results[0].geometry.location;
      resolve({ position: { lat: location.lat(), lng: location.lng() } });
    } else {
      resolve({ status });
    }
  });
});

// OpenStreetMap's search asks for one request a second, so lookups queue up politely.
let osmChain = Promise.resolve();
const osmQueue = (task) => {
  const run = osmChain.then(task);
  osmChain = run.then(() => wait(1100), () => wait(1100));
  return run;
};

const osmSearchOnce = async (query, bias) => {
  const params = new URLSearchParams({ format: 'jsonv2', limit: '1', 'accept-language': 'en', q: query });
  if (bias) {
    const span = 1.2;
    params.set('viewbox', [bias.lng - span, bias.lat + span, bias.lng + span, bias.lat - span].join(','));
  }
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  if (!response.ok) throw new Error('Search unavailable');
  const rows = await response.json();
  if (rows?.[0]) return { lat: Number(rows[0].lat), lng: Number(rows[0].lon) };
  return null;
};

// Tries the whole address first, then the same address with the front trimmed off
// (a street number or building name often confuses the search).
const osmGeocode = (query, bias) => osmQueue(async () => {
  const parts = String(query).split(',').map((part) => part.trim()).filter(Boolean);
  const variants = [query];
  for (let i = 1; i < Math.min(parts.length - 1, 3); i += 1) variants.push(parts.slice(i).join(', '));
  for (const variant of variants) {
    // eslint-disable-next-line no-await-in-loop
    const found = await osmSearchOnce(variant, bias);
    if (found) return found;
    // eslint-disable-next-line no-await-in-loop
    await wait(1100);
  }
  return null;
});

// Resolves to { lat, lng } or null when nothing can place it.
export async function geocodeQuery(query, bias) {
  if (!query) return null;
  const cached = readCache(query);
  if (cached !== undefined) return cached;

  if (window.google?.maps?.Geocoder && !googleBlocked) {
    let outcome = await googleGeocodeOnce(query, bias);
    if (outcome.status === 'OVER_QUERY_LIMIT') {
      await wait(700);
      outcome = await googleGeocodeOnce(query, bias);
    }
    if (outcome.position) {
      writeCache(query, outcome.position);
      return outcome.position;
    }
    if (outcome.status === 'ZERO_RESULTS') {
      writeCache(query, null);
      return null;
    }
    if (outcome.status === 'REQUEST_DENIED') markGoogleBlocked();
  }

  try {
    const position = await osmGeocode(query, bias);
    writeCache(query, position);
    return position;
  } catch (error) {
    return null;
  }
}
export const haversineKm = (from, to) => {
  if (!from || !to) return null;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// Streets are never a straight line, so stretch the crow-flies distance a little.
const STREET_FACTOR = 1.25;
const WALK_KMH = 4.8;

export const walkInfo = (from, to) => {
  const straight = haversineKm(from, to);
  if (straight == null) return null;
  const km = straight * STREET_FACTOR;
  const minutes = Math.max(1, Math.round((km / WALK_KMH) * 60));
  let level = 'near';
  if (km > 4) level = 'far';
  else if (km > 1.6) level = 'mid';
  return { km, minutes, level };
};

export const formatDistance = (km) => {
  if (km == null) return '';
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 10) * 10)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
};

export const formatMinutes = (minutes) => {
  if (minutes == null) return '';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};

// Teardrop map pin as an image. The pin colour says what kind of booking it is,
// the symbol inside says exactly which (bed, fork and knife, plane, train...),
// and an optional small badge shows the stop number for the day.
export const PIN_WIDTH = 44;
export const PIN_HEIGHT = 52;

export const pinSvg = ({ color, glyph = '', badge = '' }) => {
  const art = GLYPHS[glyph] || '';
  const number = String(badge).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_WIDTH}" height="${PIN_HEIGHT}" viewBox="0 0 44 52">
    <path d="M19 50C19 50 3.5 33.5 3.5 22.5a15.5 15.5 0 0 1 31 0C34.5 33.5 19 50 19 50z" fill="${color}" stroke="#ffffff" stroke-width="2.4"/>
    <circle cx="19" cy="22.5" r="11" fill="#ffffff"/>
    <g transform="translate(11.6 15.1) scale(0.62)" fill="none" stroke="${color}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${art}</g>
    ${number ? `<circle cx="33" cy="10" r="9" fill="#222946" stroke="#ffffff" stroke-width="2"/>
    <text x="33" y="${number.length > 1 ? 13.4 : 14}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${number.length > 1 ? 9 : 11}" font-weight="800" fill="#ffffff">${number}</text>` : ''}
  </svg>`;
};

// Teardrop map pin as an image. The pin colour says what kind of booking it is,
// the symbol inside says exactly which (bed, fork and knife, plane, train...),
// and an optional small badge shows the day number or the stop order.
export const pinIcon = ({ color, glyph = '', badge = '', scale = 1, dim = false }) => {
  if (!window.google?.maps) return undefined;
  const svg = pinSvg({ color, glyph, badge });
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(PIN_WIDTH * scale, PIN_HEIGHT * scale),
    anchor: new window.google.maps.Point(19 * scale, 50 * scale),
    opacity: dim ? 0.55 : 1,
  };
};
export const directionsUrl = (query, origin) => {
  const base = 'https://www.google.com/maps/dir/?api=1&travelmode=walking';
  const destination = `&destination=${encodeURIComponent(query)}`;
  return origin ? `${base}&origin=${encodeURIComponent(origin)}${destination}` : `${base}${destination}`;
};

export const placeUrl = (query) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

// One Google Maps link that walks through a whole day, in order.
export const dayRouteUrl = (queries) => {
  const stops = queries.filter(Boolean);
  if (stops.length === 0) return '';
  if (stops.length === 1) return placeUrl(stops[0]);
  const origin = stops[0];
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(1, -1).slice(0, 8).join('|');
  let url = `https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
  if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;
  return url;
};

// ---- Where the trip is, so searches favour places nearby ----
let searchBias = null;
export const setSearchBias = (position) => { if (position) searchBias = position; };
export const getSearchBias = () => searchBias;

// ---- Place search (restaurants, hotels, addresses). Google when it works, OpenStreetMap otherwise. ----
const googleUsable = () => Boolean(window.google?.maps?.places?.AutocompleteService) && !googleBlocked;

const googleSuggest = (text, kind, bias) => new Promise((resolve) => {
  try {
    const service = new window.google.maps.places.AutocompleteService();
    const request = { input: text };
    if (kind === 'restaurant') request.types = ['restaurant'];
    else if (kind === 'hotel') request.types = ['lodging'];
    if (bias) {
      request.location = new window.google.maps.LatLng(bias.lat, bias.lng);
      request.radius = 60000;
    }
    service.getPlacePredictions(request, (predictions, status) => {
      if (status === 'REQUEST_DENIED') {
        markGoogleBlocked();
        resolve(null);
        return;
      }
      resolve((predictions || []).slice(0, 6).map((item) => ({
        key: item.place_id,
        name: item.structured_formatting?.main_text || item.description,
        detail: item.structured_formatting?.secondary_text || '',
        address: item.description,
      })));
    });
  } catch (error) {
    resolve(null);
  }
});

const osmSuggest = async (text, bias) => {
  const params = new URLSearchParams({
    format: 'jsonv2', limit: '6', addressdetails: '0', extratags: '1', 'accept-language': 'en', q: text,
  });
  if (bias) {
    const span = 0.8;
    params.set('viewbox', [bias.lng - span, bias.lat + span, bias.lng + span, bias.lat - span].join(','));
  }
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  if (!response.ok) return [];
  const rows = await response.json();
  return rows.map((row) => {
    const parts = String(row.display_name || '').split(',').map((part) => part.trim())
      .filter((part) => part && !/^(?=.*\d)[A-Z0-9][A-Z0-9 -]{3,9}$/.test(part) && !/\bRegion$/i.test(part));
    const name = row.name || parts[0] || text;
    const rest = parts[0] === name ? parts.slice(1) : parts;
    return {
      key: String(row.place_id),
      name,
      detail: rest.slice(0, 4).join(', '),
      address: parts.join(', '),
      position: { lat: Number(row.lat), lng: Number(row.lon) },
      website: row.extratags?.website || row.extratags?.['contact:website'] || '',
    };
  });
};

export async function suggestPlaces(text, { kind = 'any', bias } = {}) {
  const query = String(text || '').trim();
  if (query.length < 3) return [];
  const around = bias || searchBias;
  if (googleUsable()) {
    const found = await googleSuggest(query, kind, around);
    if (found) return found;
  }
  try {
    return await osmSuggest(query, around);
  } catch (error) {
    return [];
  }
}

// ---- Real street routes (free OpenStreetMap servers). Falls back to null when unreachable. ----
export async function routeBetween(from, to, profile) {
  const server = profile === 'foot' ? 'routed-foot' : 'routed-car';
  const url = `https://routing.openstreetmap.de/${server}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const body = await response.json();
    const route = body.routes?.[0];
    if (!route) return null;
    return {
      km: route.distance / 1000,
      minutes: Math.max(1, Math.round(route.duration / 60)),
      path: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    };
  } catch (error) {
    return null;
  }
}

// Quick estimates (no network) for the little "walk / transit / drive" line between stops.
export const travelTimes = (hop) => {
  const km = hop.km;
  return {
    walk: hop.minutes,
    transit: Math.max(5, Math.round((km / 17) * 60 + 8)),
    drive: Math.max(3, Math.round((km / 28) * 60 + 3)),
  };
};

export const transitUrl = (from, to) => `https://www.google.com/maps/dir/?api=1&travelmode=transit&origin=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}`;
