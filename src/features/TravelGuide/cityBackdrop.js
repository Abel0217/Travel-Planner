import Beach from '../../Pages/css/Images/Beach.jpg';
import London from '../../Pages/css/Images/London.jpg';
import Paris from '../../Pages/css/Images/Paris.jpg';
import Rome from '../../Pages/css/Images/Rome.jpg';
import Toronto from '../../Pages/css/Images/Toronto.jpg';
import Vegas from '../../Pages/css/Images/Vegas.jpg';
import Venice from '../../Pages/css/Images/Venice.jpg';
import { sceneryImages } from '../../utils/scenery';

const UNSPLASH_ACCESS_KEY = 'OGBaaEYGlTkJhJgnTL9zm0AsrYP_r1HQ134Azhv9870';

const CITY_IMAGES = {
  paris: Paris,
  london: London,
  'las vegas': Vegas,
  vegas: Vegas,
  rome: Rome,
  toronto: Toronto,
  venice: Venice,
  honolulu: Beach,
  tampa: Beach,
  'rio de janeiro': 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1600&q=60',
  rio: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1600&q=60',
  'new york': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1600&q=60',
  'mexico city': 'https://images.unsplash.com/photo-1518659526054-190340b32735?auto=format&fit=crop&w=1600&q=60',
  madrid: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1600&q=60',
  vancouver: 'https://images.unsplash.com/photo-1559511260-66a654ae982a?auto=format&fit=crop&w=1600&q=60',
};

function cityKey(city) {
  return String(city || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function sceneryForCity(city) {
  const key = cityKey(city) || 'travel';
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return sceneryImages[hash % sceneryImages.length];
}

export function cityBackdrop(city) {
  return CITY_IMAGES[cityKey(city)] || sceneryForCity(city);
}

export async function fetchCityPhoto(city) {
  const known = CITY_IMAGES[cityKey(city)];
  if (known) return known;
  try {
    const query = `${city} travel destination landscape`;
    const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=1&client_id=${UNSPLASH_ACCESS_KEY}`);
    const data = await response.json();
    return data.results?.[0]?.urls?.regular || sceneryForCity(city);
  } catch (error) {
    return sceneryForCity(city);
  }
}
