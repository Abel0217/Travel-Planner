import axios from 'axios';

const API_KEY = '9eec8450579c6f33935c19da00d66ae4';
const BASE_URL = 'http://api.aviationstack.com/v1';

export const getFlightStatus = async (flightNumber) => {
  try {
    const response = await axios.get(`${BASE_URL}/flights`, {
      params: {
        access_key: API_KEY,
        flight_iata: flightNumber,
      },
    });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching flight status:', error);
    throw error;
  }
};
