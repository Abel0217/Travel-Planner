import axios from 'axios';

const PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

export const searchPlaces = async (query, location, radius) => {
  const apiKey = 'AIzaSyDka0NQRQUGYEq-AFevr3UaEVe4R5Uz0qE'; 
  try {
    const response = await axios.get(PLACES_API_URL, {
      params: {
        key: apiKey,
        location: location,
        radius: radius,
        keyword: query,
      },
    });
    return response.data.results;
  } catch (error) {
    console.error('Error searching places:', error);
    throw error;
  }
};
