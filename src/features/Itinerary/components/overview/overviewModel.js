// Turns the raw bookings of a trip into a list of days, each with ordered items.
import { transportGlyph } from './glyphs';
import { CATEGORIES } from '../../../../utils/bookingTheme';

export const TYPE_META = {
  stay: { label: CATEGORIES.hotel.label, color: CATEGORIES.hotel.color, tint: CATEGORIES.hotel.tint },
  food: { label: CATEGORIES.restaurant.label, color: CATEGORIES.restaurant.color, tint: CATEGORIES.restaurant.tint },
  activity: { label: CATEGORIES.activity.label, color: CATEGORIES.activity.color, tint: CATEGORIES.activity.tint },
  flight: { label: CATEGORIES.flight.label, color: CATEGORIES.flight.color, tint: CATEGORIES.flight.tint },
  transport: { label: CATEGORIES.transport.label, color: CATEGORIES.transport.color, tint: CATEGORIES.transport.tint },
};

// Day colours only tint the route line and the day card edge. They stay away from
// the blue / orange / green / purple used for booking types, so the two never get mixed up.
export const DAY_COLORS = ['#f3ab03', '#0b8f8f', '#c2255c', '#9c6644', '#6b7390', '#a61e8f'];

const MAX_DAYS = 60;

// "2026-10-05" for any date-ish value, without drifting a day across time zones.
export const dayKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (/^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z$/.test(value)) return value.slice(0, 10);
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

export const addDays = (key, amount) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + amount)).toISOString().slice(0, 10);
};

export const daysBetween = (fromKey, toKey) => {
  const toUtc = (key) => {
    const [year, month, day] = key.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(toKey) - toUtc(fromKey)) / 86400000);
};

export const todayKey = () => dayKey(new Date());

const localNoon = (key) => new Date(`${key}T12:00:00`);

export const formatDay = (key, options = { weekday: 'long', month: 'long', day: 'numeric' }) => (
  key ? localNoon(key).toLocaleDateString('en-US', options) : ''
);

const clock = (minutes) => {
  const hours = Math.floor(minutes / 60) % 24;
  const rest = minutes % 60;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const shown = hours % 12 === 0 ? 12 : hours % 12;
  return `${shown}:${String(rest).padStart(2, '0')} ${suffix}`;
};

// Accepts "14:30:00" or a full date-time and returns minutes after midnight.
export const parseTime = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const plain = /^(\d{1,2}):(\d{2})/.exec(value);
    if (plain && !value.includes('T') && !value.includes('-')) {
      return Number(plain[1]) * 60 + Number(plain[2]);
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getHours() * 60 + date.getMinutes();
};

const withTime = (minutes) => ({
  sortMin: minutes == null ? 24 * 60 + 1 : minutes,
  timeLabel: minutes == null ? '' : clock(minutes),
});

const compact = (pairs) => pairs.filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');

const placeQuery = (address, title, destination) => {
  const clean = String(address || '').trim();
  const city = String(destination || '').split(',')[0].trim().toLowerCase();
  if (clean) {
    const mentionsCity = city && clean.toLowerCase().includes(city);
    return { query: mentionsCity || !destination ? clean : `${clean}, ${destination}`, approx: false };
  }
  if (title) {
    return { query: destination ? `${title}, ${destination}` : String(title), approx: true };
  }
  return { query: '', approx: false };
};

export const buildDays = ({ startDate, endDate, destination, data }) => {
  const { activities = [], hotels = [], flights = [], restaurants = [], transport = [] } = data || {};
  const perDay = new Map();
  const put = (key, item) => {
    if (!key) return;
    if (!perDay.has(key)) perDay.set(key, []);
    perDay.get(key).push(item);
  };
  const hotelStays = [];

  activities.forEach((activity) => {
    const minutes = parseTime(activity.start_time);
    const place = placeQuery(activity.location, activity.title, destination);
    put(dayKey(activity.activity_date), {
      id: `activity-${activity.activity_id ?? activity.id}`,
      type: 'activity',
      title: activity.title || 'Activity',
      subtitle: activity.description || '',
      address: activity.location || '',
      ...place,
      ...withTime(minutes),
      startMin: minutes,
      endMin: parseTime(activity.end_time),
      details: compact([
        ['Confirmation', activity.reservation_number],
        ['Ends', activity.end_time ? clock(parseTime(activity.end_time)) : ''],
      ]),
    });
  });

  restaurants.forEach((restaurant) => {
    const minutes = parseTime(restaurant.reservation_time);
    const place = placeQuery(restaurant.address, restaurant.restaurant_name, destination);
    put(dayKey(restaurant.reservation_date), {
      id: `restaurant-${restaurant.reservation_id ?? restaurant.id}`,
      type: 'food',
      title: restaurant.restaurant_name || 'Restaurant',
      subtitle: restaurant.guest_number ? `Table For ${restaurant.guest_number}` : '',
      address: restaurant.address || '',
      ...place,
      ...withTime(minutes),
      startMin: minutes,
      endMin: null,
      details: compact([['Confirmation', restaurant.booking_confirmation]]),
    });
  });

  flights.forEach((flight) => {
    const minutes = parseTime(flight.departure_time);
    const arrival = parseTime(flight.arrival_time);
    const route = [flight.departure_airport, flight.arrival_airport].filter(Boolean).join(' → ');
    const airport = flight.arrival_airport ? `${flight.arrival_airport} airport` : '';
    const place = airport ? placeQuery(airport, '', '') : { query: '', approx: false };
    put(dayKey(flight.departure_time), {
      id: `flight-${flight.flight_id ?? flight.id}`,
      type: 'flight',
      title: `${flight.airline || 'Flight'} ${flight.flight_number || ''}`.trim(),
      subtitle: route,
      address: airport,
      ...place,
      approx: false,
      ...withTime(minutes),
      startMin: minutes,
      endMin: arrival != null && arrival > (minutes ?? -1) ? arrival : null,
      details: compact([
        ['Arrives', arrival == null ? '' : clock(arrival)],
        ['Passenger', flight.passenger_name],
        ['Seat', flight.seat_number],
        ['Confirmation', flight.booking_reference],
      ]),
    });
  });

  transport.forEach((ride) => {
    const pickupKey = dayKey(ride.pickup_time);
    const dropoffKey = dayKey(ride.dropoff_time);
    const place = placeQuery(ride.pickup_location, ride.type, destination);
    const subtitle = [ride.pickup_location, ride.dropoff_location].filter(Boolean).join(' → ');
    put(pickupKey, {
      id: `transport-${ride.transport_id ?? ride.id}`,
      type: 'transport',
      icon: transportGlyph(ride.type),
      title: ride.type || 'Transport',
      subtitle,
      address: ride.pickup_location || '',
      tag: 'Pick-Up',
      ...place,
      ...withTime(parseTime(ride.pickup_time)),
      startMin: parseTime(ride.pickup_time),
      endMin: dropoffKey === pickupKey ? parseTime(ride.dropoff_time) : null,
      details: compact([['Confirmation', ride.booking_reference]]),
    });
    if (dropoffKey && dropoffKey !== pickupKey) {
      const dropPlace = placeQuery(ride.dropoff_location, ride.type, destination);
      put(dropoffKey, {
        id: `transport-${ride.transport_id ?? ride.id}-drop`,
        type: 'transport',
        icon: transportGlyph(ride.type),
        title: ride.type || 'Transport',
        subtitle,
        address: ride.dropoff_location || '',
        tag: 'Drop-Off',
        ...dropPlace,
        ...withTime(parseTime(ride.dropoff_time)),
        startMin: parseTime(ride.dropoff_time),
        endMin: null,
        details: compact([['Confirmation', ride.booking_reference]]),
      });
    }
  });

  hotels.forEach((hotel) => {
    const checkIn = dayKey(hotel.check_in_date);
    const checkOut = dayKey(hotel.check_out_date);
    const place = placeQuery(hotel.address, hotel.hotel_name, destination);
    const base = {
      type: 'stay',
      title: hotel.hotel_name || 'Hotel',
      address: hotel.address || '',
      ...place,
      details: compact([['Confirmation', hotel.booking_confirmation]]),
    };
    const stay = {
      id: `hotel-${hotel.hotel_id ?? hotel.id}`,
      name: base.title,
      query: base.query,
      address: base.address,
      checkIn,
      checkOut: checkOut || checkIn,
    };
    hotelStays.push(stay);
    if (checkIn) {
      put(checkIn, { ...base, id: `${stay.id}-in`, stayId: stay.id, tag: 'Check-In', subtitle: 'Your stay begins', ...withTime(15 * 60), startMin: 15 * 60, endMin: null });
    }
    if (checkOut && checkOut !== checkIn) {
      put(checkOut, { ...base, id: `${stay.id}-out`, stayId: stay.id, tag: 'Check-Out', subtitle: 'Say goodbye to your room', ...withTime(10 * 60), startMin: 10 * 60, endMin: null });
    }
  });

  // Days of the trip, widened if something is booked just outside the dates.
  const tripStart = dayKey(startDate);
  const tripEnd = dayKey(endDate);
  const keys = [...perDay.keys()].sort();
  const first = [tripStart, keys[0]].filter(Boolean).sort()[0];
  const last = [tripEnd, keys[keys.length - 1]].filter(Boolean).sort().slice(-1)[0];

  const days = [];
  let tripNumber = 0;
  if (first && last) {
    for (let key = first, count = 0; key <= last && count < MAX_DAYS; key = addDays(key, 1), count += 1) {
      const items = (perDay.get(key) || []).slice().sort((a, b) => a.sortMin - b.sortMin);
      const staying = hotelStays.find((stay) => stay.checkIn && stay.checkIn <= key && key < stay.checkOut)
        || hotelStays.find((stay) => stay.checkIn && stay.checkIn <= key && key <= stay.checkOut)
        || null;
      let numbered = 0;
      const inTripDay = (!tripStart || key >= tripStart) && (!tripEnd || key <= tripEnd);
      items.forEach((item) => {
        item.dayKey = key;
        item.dayNum = inTripDay ? tripNumber + 1 : 0;
        item.icon = item.icon || item.type;
        item.order = item.type === 'activity' || item.type === 'food' ? (numbered += 1) : 0;
      });
      const inTrip = (!tripStart || key >= tripStart) && (!tripEnd || key <= tripEnd);
      days.push({
        key,
        index: days.length,
        num: inTrip ? (tripNumber += 1) : 0,
        items,
        staying,
        night: staying && key < staying.checkOut ? daysBetween(staying.checkIn, key) + 1 : 0,
        nights: staying ? Math.max(1, daysBetween(staying.checkIn, staying.checkOut)) : 0,
        inTrip,
      });
    }
  }

  return { days, hotelStays };
};
