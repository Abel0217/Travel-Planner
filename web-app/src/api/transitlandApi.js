import axios from 'axios';

const BASE_URL = 'https://transit.land/api/v1';

export const getTransitStops = async (lat, lon, radius) => {
  try {
    const response = await axios.get(`${BASE_URL}/stops`, {
      params: {
        lat,
        lon,
        r: radius
      }
    });
    return response.data.stops;
  } catch (error) {
    console.error('Error fetching transit stops:', error);
    throw error;
  }
};
