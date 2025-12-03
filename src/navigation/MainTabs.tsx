import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AgentControleScreen from '../screens/AgentControleScreen';
import AgentHygieneScreen from '../screens/AgentHygieneScreen';
import SecuriteScreen from '../screens/SecuriteScreen';
import DirectionScreen from '../screens/DirectionScreen';
import ParametresScreen from '../screens/ParametresScreen';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { user } = useAuth();

  const role = user?.role;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
      }}
    >
      {(role === 'AGENT_CONTROLE' || role === 'admin') && (
        <Tab.Screen
          name="Contrôle"
          component={AgentControleScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="clipboard-check-outline" color={color} size={size} />
            ),
          }}
        />
      )}

      {(role === 'AGENT_HYGIENE' || role === 'admin') && (
        <Tab.Screen
          name="Hygiène"
          component={AgentHygieneScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="spray-bottle" color={color} size={size} />
            ),
          }}
        />
      )}

      {(role === 'SECURITE' || role === 'admin') && (
        <Tab.Screen
          name="Sécurité"
          component={SecuriteScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="shield-lock-outline" color={color} size={size} />
            ),
          }}
        />
      )}

      {(role === 'DIRECTION' || role === 'admin') && (
        <Tab.Screen
          name="Direction"
          component={DirectionScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="view-dashboard-outline" color={color} size={size} />
            ),
          }}
        />
      )}

      <Tab.Screen
        name="Paramètres"
        component={ParametresScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
