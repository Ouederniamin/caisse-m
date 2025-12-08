import { Platform } from 'react-native';

// Backend API URL - use localhost on web, local IP on native
const getApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // On web, use localhost; on native, use the local IP
  if (Platform.OS === 'web') {
    return 'http://localhost:3001';
  }
  return 'http://10.252.169.215:3001';
};

export const API_URL = getApiUrl();

// Expo project ID (for push notifications)
export const EXPO_PROJECT_ID = process.env.EXPO_PUBLIC_PROJECT_ID || '';
