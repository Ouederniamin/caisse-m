import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_URL } from '../config';

// Completely lazy-loaded notifications - avoid any module-level evaluation
let notificationsModule: any = null;
let notificationsInitialized = false;

async function getNotifications(): Promise<any> {
  if (notificationsModule) return notificationsModule;
  
  try {
    // Dynamic import with error handling
    notificationsModule = await import('expo-notifications');
    
    // Configure notification handler only once
    if (!notificationsInitialized && notificationsModule) {
      notificationsInitialized = true;
      try {
        notificationsModule.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
      } catch (handlerError) {
        console.warn('[PushNotifications] Could not set handler:', handlerError);
      }
    }
    
    return notificationsModule;
  } catch (error) {
    console.warn('[PushNotifications] expo-notifications not available:', error);
    return null;
  }
}

class PushNotificationService {
  private expoPushToken: string | null = null;

  // Request permissions and get push token
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('[PushNotifications] Must use physical device for push notifications');
      return null;
    }

    const Notif = await getNotifications();
    if (!Notif) {
      console.log('[PushNotifications] Notifications module not available');
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notif.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notif.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushNotifications] Permission not granted');
      return null;
    }

    // Get Expo push token
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      const tokenResponse = await Notif.getExpoPushTokenAsync({
        projectId: projectId || undefined,
      });
      
      this.expoPushToken = tokenResponse.data;
      console.log('[PushNotifications] Got push token:', this.expoPushToken);

      // Android-specific channel configuration
      if (Platform.OS === 'android') {
        await Notif.setNotificationChannelAsync('default', {
          name: 'Notifications',
          importance: Notif.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        await Notif.setNotificationChannelAsync('urgent', {
          name: 'Alertes Urgentes',
          importance: Notif.AndroidImportance.HIGH,
          vibrationPattern: [0, 500, 200, 500],
          lightColor: '#FF0000',
          sound: 'default',
        });
      }

      return this.expoPushToken;
    } catch (error) {
      console.error('[PushNotifications] Error getting token:', error);
      return null;
    }
  }

  // Register token with backend
  async registerTokenWithBackend(authToken: string): Promise<boolean> {
    if (!this.expoPushToken) {
      const token = await this.registerForPushNotifications();
      if (!token) return false;
    }

    try {
      const response = await fetch(`${API_URL}/api/notifications/register-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          expoPushToken: this.expoPushToken,
        }),
      });

      if (response.ok) {
        console.log('[PushNotifications] Token registered with backend');
        return true;
      } else {
        console.error('[PushNotifications] Failed to register token');
        return false;
      }
    } catch (error) {
      console.error('[PushNotifications] Error registering token:', error);
      return false;
    }
  }

  // Get current token
  getToken(): string | null {
    return this.expoPushToken;
  }

  // Add notification received listener
  addNotificationReceivedListener(
    callback: (notification: any) => void
  ): { remove: () => void } {
    let subscription: { remove: () => void } | null = null;
    
    getNotifications().then(Notif => {
      if (Notif) {
        try {
          subscription = Notif.addNotificationReceivedListener(callback);
        } catch (e) {
          console.warn('[PushNotifications] Could not add listener:', e);
        }
      }
    }).catch(() => {});
    
    return {
      remove: () => {
        if (subscription) subscription.remove();
      }
    };
  }

  // Add notification response listener (when user taps notification)
  addNotificationResponseListener(
    callback: (response: any) => void
  ): { remove: () => void } {
    let subscription: { remove: () => void } | null = null;
    
    getNotifications().then(Notif => {
      if (Notif) {
        try {
          subscription = Notif.addNotificationResponseReceivedListener(callback);
        } catch (e) {
          console.warn('[PushNotifications] Could not add response listener:', e);
        }
      }
    }).catch(() => {});
    
    return {
      remove: () => {
        if (subscription) subscription.remove();
      }
    };
  }

  // Schedule local notification (for testing)
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    seconds: number = 1
  ): Promise<string | null> {
    const Notif = await getNotifications();
    if (!Notif) return null;
    
    try {
      return await Notif.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: { type: Notif.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
      });
    } catch (error) {
      console.warn('[PushNotifications] Could not schedule:', error);
      return null;
    }
  }

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    const Notif = await getNotifications();
    if (Notif) {
      try {
        await Notif.cancelAllScheduledNotificationsAsync();
      } catch (error) {
        console.warn('[PushNotifications] Could not cancel:', error);
      }
    }
  }

  // Get badge count
  async getBadgeCount(): Promise<number> {
    const Notif = await getNotifications();
    if (!Notif) return 0;
    try {
      return await Notif.getBadgeCountAsync();
    } catch (error) {
      return 0;
    }
  }

  // Set badge count
  async setBadgeCount(count: number): Promise<void> {
    const Notif = await getNotifications();
    if (Notif) {
      try {
        await Notif.setBadgeCountAsync(count);
      } catch (error) {
        console.warn('[PushNotifications] Could not set badge:', error);
      }
    }
  }

  // Clear badge
  async clearBadge(): Promise<void> {
    const Notif = await getNotifications();
    if (Notif) {
      try {
        await Notif.setBadgeCountAsync(0);
      } catch (error) {
        console.warn('[PushNotifications] Could not clear badge:', error);
      }
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
