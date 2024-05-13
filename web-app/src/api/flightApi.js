// /web-app/src/api/flightApi.js
import axios from 'axios';

const API_KEY = 'ybe16af465fmshbc4872b3e31a437p1aeb85jsnd7763af531f3';
const BASE_URL = 'https://partners.api.skyscanner.net/apiservices';

const fetchFlights = async (params) => {
    try {
        const { data } = await axios.get(`${BASE_URL}/browseroutes/v1.0/US/USD/en-US/${params.from}/${params.to}/${params.date}?apiKey=${API_KEY}`);
        return data;
    } catch (error) {
        console.error('Failed to fetch flight data:', error);
        return null;
    }
}

export { fetchFlights };
