import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Platform-agnostic storage utility
 * Uses SecureStore on native platforms and localStorage on web
 */
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.error('localStorage.getItem error:', e);
        return null;
      }
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.error('localStorage.setItem error:', e);
      }
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error('localStorage.removeItem error:', e);
      }
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

export default storage;
