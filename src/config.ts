import { Platform } from 'react-native';

// Backend API URL - use environment variable or fallback to localhost
const getApiUrl = () => {
  // Check for production API URL from environment variable
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Development fallbacks
  if (Platform.OS === 'web') {
    return 'http://localhost:3001';
  }
  
  // For local development on physical device, use your machine's IP
  return 'http://10.252.169.215:3001';
};

export const API_URL = getApiUrl();

// Expo project ID (for push notifications)
export const EXPO_PROJECT_ID = process.env.EXPO_PUBLIC_PROJECT_ID || '';
