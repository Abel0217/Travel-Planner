// /web-app/src/api/weatherApi.js
import axios from 'axios';

const API_KEY = '6de2344578a3c9e6e0a59efad6e0564f';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

const fetchWeather = async (lat, lon) => {
    try {
        const { data } = await axios.get(`${BASE_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
        return data;
    } catch (error) {
        console.error('Failed to fetch weather data:', error);
        return null;
    }
}

export { fetchWeather };
