import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:3001' // Ensure this is the correct port and host for your backend
});

export default apiClient;
