import axios from 'axios';

const CLIENT_ID = 'NDE5NTkyOTB8MTcxNzI4NTQzMC42MDAxNzM3';
const BASE_URL = 'https://api.seatgeek.com/2';

export const getEvents = async (query) => {
  try {
    const response = await axios.get(`${BASE_URL}/events`, {
      params: {
        client_id: CLIENT_ID,
        q: query,
      },
    });
    return response.data.events;
  } catch (error) {
    console.error('Error fetching events from SeatGeek:', error);
    throw error;
  }
};
