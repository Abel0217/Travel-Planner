// One place for the five booking categories, so every screen shows them the same way.
// Expense ledger colours, map pins, overview cards, forms and the bookings lists all read from here.

export const CATEGORY_ORDER = ['activity', 'restaurant', 'hotel', 'flight', 'transport'];

export const CATEGORIES = {
  activity: { key: 'activity', label: 'Activity', plural: 'Activities', color: '#2b8a3e', tint: '#e6f4ea', glyph: 'activity' },
  restaurant: { key: 'restaurant', label: 'Restaurant', plural: 'Restaurants', color: '#d9480f', tint: '#fdeee6', glyph: 'food' },
  hotel: { key: 'hotel', label: 'Hotel', plural: 'Hotels', color: '#1d6fe8', tint: '#e7f0fd', glyph: 'stay' },
  flight: { key: 'flight', label: 'Flight', plural: 'Flights', color: '#7b2cbf', tint: '#f1e8fa', glyph: 'flight' },
  transport: { key: 'transport', label: 'Transport', plural: 'Transport', color: '#5c6b8a', tint: '#eceff5', glyph: 'transport' },
};

export const categoryFor = (key) => CATEGORIES[key] || null;
