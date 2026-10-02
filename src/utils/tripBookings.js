import apiClient from '../api/apiClient';
import { dayKey } from '../features/Itinerary/components/overview/overviewModel';

// Lets Ask Leo know what is already on a trip, so it can say "this is already added"
// instead of asking again.

const norm = (text) => String(text || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'at', 'in', 'to', 'and', 'visit', 'tour', 'restaurant', 'cafe', 'hotel']);

const tokens = (text) => norm(text).split(' ').filter((word) => word && !STOP_WORDS.has(word));

export const sameName = (left, right) => {
  const a = norm(left);
  const b = norm(right);
  if (!a || !b) return false;
  if (a === b) return true;
  if ((a.length >= 5 && b.includes(a)) || (b.length >= 5 && a.includes(b))) return true;
  const ta = tokens(left);
  const tb = tokens(right);
  if (ta.length < 2 || tb.length < 2) return false;
  const shared = ta.filter((word) => tb.includes(word)).length;
  return shared / Math.min(ta.length, tb.length) >= 0.8;
};

const KINDS = [
  ['activity', 'activities', (item) => ({ id: item.activity_id, title: item.title, date: dayKey(item.activity_date), time: String(item.start_time || '').slice(0, 5) })],
  ['restaurant', 'restaurants', (item) => ({ id: item.reservation_id, title: item.restaurant_name, date: dayKey(item.reservation_date), time: String(item.reservation_time || '').slice(0, 5) })],
  ['hotel', 'hotels', (item) => ({ id: item.hotel_id, title: item.hotel_name, date: dayKey(item.check_in_date), time: '' })],
  ['transport', 'transport', (item) => ({ id: item.transport_id, title: item.type, date: dayKey(item.pickup_time), time: '' })],
];

export async function fetchTripBookings(itineraryId) {
  if (!itineraryId) return [];
  const lists = await Promise.all(KINDS.map(async ([type, resource, pick]) => {
    try {
      const response = await apiClient.get(`/itineraries/${itineraryId}/${resource}`);
      return (response.data || []).map((raw) => ({ type, raw, ...pick(raw) }));
    } catch (error) {
      return [];
    }
  }));
  return lists.flat();
}

export const findOnTrip = (bookings, place) => bookings.find((item) => sameName(item.title, place)) || null;
