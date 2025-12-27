import { Platform } from 'react-native';
import Constants from 'expo-constants';

// TEMPORARY: Force production backend for web testing
const FORCE_PRODUCTION = true;

// Backend API URL - uses local backend for development, production for builds
const getApiUrl = () => {
  // Check if running in development mode
  const isDev = __DEV__;
  
  // Force production backend for testing
  if (FORCE_PRODUCTION) {
    return 'https://caisse-b.vercel.app';
  }
  
  if (isDev) {
    // In development, use local backend
    if (Platform.OS === 'web') {
      // Web browser - use localhost directly
      return 'http://localhost:3001';
    } else if (Platform.OS === 'android') {
      // Android emulator uses 10.0.2.2 to reach host machine
      return 'http://10.0.2.2:3001';
    } else if (Platform.OS === 'ios') {
      // iOS simulator can use localhost
      return 'http://localhost:3001';
    }
    // Fallback for physical devices - use your machine's IP
    // You may need to update this to your local IP address
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      return `http://${host}:3001`;
    }
    return 'http://localhost:3001';
  }
  
  // Production - use Vercel backend
  return 'https://caisse-b.vercel.app';
};

export const API_URL = getApiUrl();

// Log API URL in dev for debugging
if (__DEV__) {
  console.log('📡 API URL:', API_URL);
}

// Expo project ID (for push notifications)
export const EXPO_PROJECT_ID = process.env.EXPO_PUBLIC_PROJECT_ID || '';
