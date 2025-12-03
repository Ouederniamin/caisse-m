import axios from 'axios';
import storage from '../utils/storage';
import { Platform } from 'react-native';

// Backend API (Fastify)
// On web: use localhost (same machine)
// On native: use local network IP (must be on same network)
const API_URL = Platform.OS === 'web' 
  ? 'http://localhost:3001' 
  : 'http://10.89.164.215:3001'; 

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await storage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
