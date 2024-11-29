import axios from 'axios';
import { getAuth } from "firebase/auth";

const apiClient = axios.create({
    baseURL: 'http://localhost:3001', 
});

apiClient.interceptors.request.use(async (config) => {
    const auth = getAuth(); 
    const currentUser = auth.currentUser; 

    if (currentUser) {
        const token = await currentUser.getIdToken(true);

        console.log('Firebase ID Token:', token);

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

export default apiClient;
