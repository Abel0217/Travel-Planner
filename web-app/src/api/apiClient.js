import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3001/', // Adjust to your API's base URL
  headers: {
    'Content-Type': 'application/json'
  }
});

export default apiClient;
