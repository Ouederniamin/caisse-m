import { Platform } from 'react-native';

// Backend API URL - Always use production Vercel backend
const getApiUrl = () => {
  // Always use production backend (even for local dev)
  return 'https://caisse-b.vercel.app';
};

export const API_URL = getApiUrl();

// Expo project ID (for push notifications)
export const EXPO_PROJECT_ID = process.env.EXPO_PUBLIC_PROJECT_ID || '';
