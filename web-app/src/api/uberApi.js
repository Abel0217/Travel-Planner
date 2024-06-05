import axios from 'axios';

const CLIENT_ID = 'Eu00EjPO6ecBvqtRjsd32S5OTzY3RGrP';
const CLIENT_SECRET = '6p70Olzuy1uL5QkFZLAJo9y6C05v_Qm3jzz3RKel';
const SERVER_TOKEN = 'your_uber_server_token'; // Replace this with the actual server token if available
const BASE_URL = 'https://api.uber.com/v1.2';

export const getEstimates = async (startLatitude, startLongitude, endLatitude, endLongitude) => {
  try {
    const response = await axios.get(`${BASE_URL}/estimates/price`, {
      headers: {
        Authorization: `Token ${SERVER_TOKEN}`
      },
      params: {
        start_latitude: startLatitude,
        start_longitude: startLongitude,
        end_latitude: endLatitude,
        end_longitude: endLongitude
      }
    });
    return response.data.prices;
  } catch (error) {
    console.error('Error fetching Uber estimates:', error);
    throw error;
  }
};
