import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, Button, StatusBar, useColorScheme, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, MD3LightTheme, configureFonts } from 'react-native-paper';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import SecuriteScreen from './src/screens/SecuriteScreen';
import PeseeSortieScreen from './src/screens/PeseeSortieScreen';
import PeseeEntreeScreen from './src/screens/PeseeEntreeScreen';
import AgentControleScreen from './src/screens/AgentControleScreen';
import AgentControleCreateTourScreen from './src/screens/AgentControleCreateTourScreen';
import AgentControleRetourScreen from './src/screens/AgentControleRetourScreen';
import TourDetailScreen from './src/screens/TourDetailScreen';
import AgentHygieneScreen from './src/screens/AgentHygieneScreen';
import AgentHygieneDetailScreen from './src/screens/AgentHygieneDetailScreen';
import ConflictDetailScreen from './src/screens/ConflictDetailScreen';
import DirectionScreen from './src/screens/DirectionScreen';
import MainTabs from './src/navigation/MainTabs';
import api from './src/services/api';
import pushNotificationService from './src/services/pushNotificationService';

const Stack = createNativeStackNavigator();

// Custom light theme with better colors
const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2563eb', // Blue 600
    primaryContainer: '#dbeafe', // Blue 100
    secondary: '#7c3aed', // Violet 600
    secondaryContainer: '#ede9fe', // Violet 100
    tertiary: '#dc2626', // Red 600
    tertiaryContainer: '#fee2e2', // Red 100
    surface: '#ffffff',
    surfaceVariant: '#f3f4f6', // Gray 100
    surfaceDisabled: '#e5e7eb', // Gray 200
    background: '#f9fafb', // Gray 50
    error: '#dc2626',
    errorContainer: '#fee2e2',
    onPrimary: '#ffffff',
    onPrimaryContainer: '#1e3a8a',
    onSecondary: '#ffffff',
    onSecondaryContainer: '#4c1d95',
    onTertiary: '#ffffff',
    onTertiaryContainer: '#7f1d1d',
    onSurface: '#111827', // Gray 900
    onSurfaceVariant: '#4b5563', // Gray 600
    onSurfaceDisabled: '#9ca3af', // Gray 400
    onError: '#ffffff',
    onErrorContainer: '#7f1d1d',
    onBackground: '#111827',
    outline: '#d1d5db', // Gray 300
    outlineVariant: '#e5e7eb', // Gray 200
    inverseSurface: '#1f2937',
    inverseOnSurface: '#f9fafb',
    inversePrimary: '#60a5fa',
    shadow: '#000000',
    scrim: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.4)',
    elevation: {
      level0: 'transparent',
      level1: '#ffffff',
      level2: '#f9fafb',
      level3: '#f3f4f6',
      level4: '#e5e7eb',
      level5: '#d1d5db',
    },
  },
};

function AppContent() {
  const { userToken, isLoading, user } = useAuth();
  // WiFi security disabled - always allow access
  const [isConnectedToAllowedNetwork, setIsConnectedToAllowedNetwork] = useState<boolean | null>(true);
  const [networkCheckMessage, setNetworkCheckMessage] = useState('WiFi security disabled');

  // WiFi check disabled for now
  // useEffect(() => {
  //   checkNetwork();
  // }, []);

  // Initialize push notifications for Direction users
  useEffect(() => {
    if (userToken && user && (user.role === 'DIRECTION' || user.role === 'ADMIN' || user.role === 'admin')) {
      console.log('[App] Initializing push notifications for Direction user');
      pushNotificationService.registerTokenWithBackend(userToken);
      
      // Add notification listeners
      const notificationListener = pushNotificationService.addNotificationReceivedListener(
        (notification) => {
          console.log('[App] Notification received:', notification);
        }
      );
      
      const responseListener = pushNotificationService.addNotificationResponseListener(
        (response) => {
          console.log('[App] Notification tapped:', response);
          // Could navigate to notifications screen here
        }
      );

      return () => {
        notificationListener.remove();
        responseListener.remove();
      };
    }
  }, [userToken, user]);

  const checkNetwork = async () => {
    try {
      // First, check if WiFi security is enabled on the backend
      try {
        const configResponse = await api.get('/config/wifi-security-status');
        
        if (!configResponse.data.enabled) {
          // WiFi security is disabled - allow access
          console.log('WiFi security disabled, allowing access');
          setIsConnectedToAllowedNetwork(true);
          setNetworkCheckMessage('Mode développement - Sécurité WiFi désactivée');
          return;
        }
      } catch (error: any) {
        // If backend not reachable, allow in dev mode
        if (error.code === 'ECONNREFUSED' || !error.response) {
          console.warn('Backend not reachable, allowing access for development');
          setIsConnectedToAllowedNetwork(true);
          setNetworkCheckMessage('Mode développement - Backend inaccessible');
          return;
        }
      }

      // WiFi security is enabled, proceed with network check
      const networkState = await Network.getNetworkStateAsync();
      
      if (networkState.type !== Network.NetworkStateType.WIFI) {
        setIsConnectedToAllowedNetwork(false);
        setNetworkCheckMessage('Vous devez être connecté à un réseau WiFi');
        return;
      }

      // Get WiFi info (SSID and BSSID)
      const ssid = await Network.getIpAddressAsync();
      const wifiInfo = await Network.getNetworkStateAsync();
      
      // For React Native, we need to get BSSID from native modules
      // In a real implementation, you'd use a library like react-native-wifi-reborn
      // For now, we'll try to verify with the backend
      
      try {
        // Try to verify network with backend
        const response = await api.post('/mobile/verify-network', {
          ssid: 'AndroidWifi', // You'll need to get actual SSID from native module
          bssid: '00:00:00:00:00:00' // You'll need to get actual BSSID from native module
        });

        if (response.data.allowed) {
          setIsConnectedToAllowedNetwork(true);
          setNetworkCheckMessage('Réseau autorisé');
        } else {
          setIsConnectedToAllowedNetwork(false);
          setNetworkCheckMessage(response.data.error || 'Réseau non autorisé');
        }
      } catch (error: any) {
        // If verification endpoint returns 403, network not allowed
        if (error.response?.status === 403) {
          setIsConnectedToAllowedNetwork(false);
          setNetworkCheckMessage(error.response.data.error || 'Réseau non autorisé');
        } else if (error.code === 'ECONNREFUSED' || !error.response) {
          // Backend not reachable - allow in dev mode
          console.warn('Backend not reachable, allowing access for development');
          setIsConnectedToAllowedNetwork(true);
          setNetworkCheckMessage('Mode développement');
        } else {
          setIsConnectedToAllowedNetwork(false);
          setNetworkCheckMessage('Erreur de vérification réseau');
        }
      }
    } catch (e) {
      console.error('Network check error:', e);
      // In dev mode, allow access if we can't check
      setIsConnectedToAllowedNetwork(true);
      setNetworkCheckMessage('Mode développement (erreur réseau)');
    }
  };

  if (isConnectedToAllowedNetwork === false) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#dc2626" />
        <View style={styles.containerError}>
          <Text style={styles.errorText}>⚠️ Connexion non autorisée</Text>
          <Text style={styles.errorMessage}>{networkCheckMessage}</Text>
          <Text style={styles.errorSubtext}>Connectez-vous au WiFi autorisé de l'usine</Text>
          <Text style={styles.errorSubtext}>Le réseau doit être configuré par l'administrateur</Text>
          <Button title="Réessayer" onPress={checkNetwork} color="#fff" />
        </View>
      </>
    );
  }

  if (isLoading || isConnectedToAllowedNetwork === null) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#2E7D32" />
        <View style={styles.loadingContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>🏛️</Text>
          </View>
          <Text style={styles.loadingTitle}>El Firma</Text>
          <ActivityIndicator size="large" color="#2E7D32" style={styles.spinner} />
          <Text style={styles.loadingSubtext}>Chargement...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {userToken == null ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : (
            <>
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen name="PeseeSortie" component={PeseeSortieScreen} />
              <Stack.Screen name="PeseeEntree" component={PeseeEntreeScreen} />
              <Stack.Screen name="AgentControleCreateTour" component={AgentControleCreateTourScreen} />
              <Stack.Screen name="AgentControleRetour" component={AgentControleRetourScreen} />
              <Stack.Screen name="TourDetail" component={TourDetailScreen} />
              <Stack.Screen name="AgentHygieneDetail" component={AgentHygieneDetailScreen} />
              <Stack.Screen name="ConflictDetail" component={ConflictDetailScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <PaperProvider theme={lightTheme}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 40,
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 24,
  },
  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    marginTop: 10,
  },
  containerError: {
    flex: 1,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorMessage: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
});

