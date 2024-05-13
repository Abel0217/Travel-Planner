// /web-app/src/api/mapsApi.js
import { Loader } from '@googlemaps/js-api-loader';

const API_KEY = 'your_google_maps_api_key_here';
const loader = new Loader({
  apiKey: API_KEY,
  version: "weekly",
  libraries: ["places"]
});

const loadMap = async (containerId, options) => {
  try {
    await loader.load();
    const map = new window.google.maps.Map(document.getElementById(containerId), options);
    return map;
  } catch (error) {
    console.error('Failed to load Google map:', error);
    return null;
  }
}

export { loadMap };
