import axios from 'axios';

const API_KEY = 'a11ee3a342774d44a8511532241406';
const BASE_URL = 'http://api.weatherapi.com/v1';

export const fetchWeather = async (latitude, longitude, date) => {
    const formattedDate = new Date(date).toISOString().split('T')[0];
    const url = `${BASE_URL}/forecast.json?key=${API_KEY}&q=${latitude},${longitude}&dt=${formattedDate}`;

    try {
        const response = await axios.get(url);
        const forecast = response.data.forecast.forecastday[0].day;
        return {
            condition: forecast.condition.text,
            icon: forecast.condition.icon,
            temp: forecast.maxtemp_c,  
            max_temp: forecast.maxtemp_c,
            min_temp: forecast.mintemp_c
        };
    } catch (error) {
        console.error('Error fetching weather data:', error);
        throw error;
    }
};
