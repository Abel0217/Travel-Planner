export function parseDestination(destinations) {
  const parts = String(destinations || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return { city: '', country: '' };
  }

  if (parts.length === 1) {
    return { city: parts[0], country: parts[0] };
  }

  return {
    city: parts[0],
    country: parts[parts.length - 1],
  };
}

// `options.day` (YYYY-MM-DD) tells Ask Leo which day of the trip you are planning,
// so "Add To Trip" starts on that day.
export async function openLeoForItinerary(apiClient, navigate, itinerary, options = {}) {
  const itineraryId = itinerary?.itinerary_id || itinerary?.id;
  const { city, country } = parseDestination(itinerary?.destinations);
  if (!itineraryId || !city || !country) {
    navigate('/travel-guide');
    return;
  }

  const response = await apiClient.post('/ai/chats', {
    country,
    city,
    itinerary_id: Number(itineraryId),
  });

  const day = options.day ? `&day=${encodeURIComponent(options.day)}` : '';
  const ask = options.prompt ? `&ask=${encodeURIComponent(options.prompt)}` : '';
  navigate(
    `/travel-guide/${encodeURIComponent(response.data.country)}/${encodeURIComponent(response.data.city)}?itineraryId=${itineraryId}${day}${ask}`
  );
}
