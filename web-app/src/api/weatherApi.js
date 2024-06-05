import axios from 'axios';

const API_KEY = '6de2344578a3c9e6e0a59efad6e0564f';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

export const fetchWeather = async (location) => {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        q: location,
        appid: API_KEY,
        units: 'metric'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
};
