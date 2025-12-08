import React from 'react';
import { createBottomTabNavigator, BottomTabBarProps, BottomTabBar } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import AgentControleScreen from '../screens/AgentControleScreen';
import AgentHygieneScreen from '../screens/AgentHygieneScreen';
import SecuriteScreen from '../screens/SecuriteScreen';
import DirectionDashboardScreen from '../screens/direction/DirectionDashboardScreen';
import DirectionConflictsScreen from '../screens/direction/DirectionConflictsScreen';
import DirectionToursScreen from '../screens/direction/DirectionToursScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ParametresScreen from '../screens/ParametresScreen';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();
const DirectionStack = createNativeStackNavigator();

// Direction Stack Navigator for nested screens
function DashboardStackNavigator() {
  return (
    <DirectionStack.Navigator screenOptions={{ headerShown: false }}>
      <DirectionStack.Screen name="DirectionDashboard" component={DirectionDashboardScreen} />
      <DirectionStack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ 
          headerShown: true,
          headerTitle: 'Notifications',
          headerBackTitle: 'Retour'
        }} 
      />
    </DirectionStack.Navigator>
  );
}

type ControleTabBarProps = BottomTabBarProps & {
  showCreateShortcut?: boolean;
};

function ControleTabBar({ showCreateShortcut, ...props }: ControleTabBarProps) {
  if (!showCreateShortcut) {
    return (
      <View style={tabStyles.wrapper}>
        <BottomTabBar {...props} />
      </View>
    );
  }

  const { state, descriptors, navigation } = props;

  const handleCreatePress = () => {
    const parentNavigator = navigation.getParent();
    if (parentNavigator) {
      parentNavigator.navigate('AgentControleCreateTour' as never);
    } else {
      navigation.navigate('AgentControleCreateTour' as never);
    }
  };

  const renderTab = (route: any, index: number) => {
    const { options } = descriptors[route.key];
    const label =
      options.tabBarLabel !== undefined
        ? options.tabBarLabel
        : options.title !== undefined
          ? options.title
          : route.name;
    const isFocused = state.index === index;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    const onLongPress = () => {
      navigation.emit({
        type: 'tabLongPress',
        target: route.key,
      });
    };

    const color = isFocused ? '#2563eb' : '#94a3b8';
    const icon = options.tabBarIcon
      ? options.tabBarIcon({ color, size: 20 })
      : null;

    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        testID={options.tabBarTestID}
        onPress={onPress}
        onLongPress={onLongPress}
        style={tabStyles.inlineTab}
        key={route.key}
        activeOpacity={0.8}
      >
        <View style={tabStyles.inlineIconWrapper}>{icon}</View>
        <Text style={[tabStyles.inlineLabel, isFocused && tabStyles.inlineLabelActive]}>{label as string}</Text>
      </TouchableOpacity>
    );
  };

  const elements: React.ReactNode[] = [];
  state.routes.forEach((route, index) => {
    elements.push(renderTab(route, index));
    if (route.name === 'Contrôle') {
      elements.push(
        <TouchableOpacity
          key="center-action"
          style={tabStyles.inlineCenterAction}
          activeOpacity={0.9}
          onPress={handleCreatePress}
        >
          <View style={tabStyles.inlineCenterCircle}>
            <MaterialCommunityIcons name="plus" size={22} color="#fff" />
          </View>
          <Text style={tabStyles.inlineCenterLabel}>Créer</Text>
        </TouchableOpacity>
      );
    }
  });

  return (
    <View style={tabStyles.inlineWrapper}>
      <View style={tabStyles.inlineBar}>{elements}</View>
    </View>
  );
}

export default function MainTabs() {
  const { user } = useAuth();

  const role = user?.role;
  const showControleCenterAction = role === 'AGENT_CONTROLE';

  // Direction/Admin role tabs
  if (role === 'DIRECTION' || role === 'admin') {
    return (
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#3F51B5',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarStyle: {
            position: 'absolute',
            bottom: 20,
            left: 16,
            right: 16,
            elevation: 12,
            backgroundColor: '#ffffff',
            borderRadius: 28,
            height: 80,
            shadowColor: '#3F51B5',
            shadowOffset: {
              width: 0,
              height: 10,
            },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            borderTopWidth: 0,
            paddingHorizontal: 4,
          },
          tabBarItemStyle: {
            paddingVertical: 6,
            height: 80,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 4,
          },
          tabBarIconStyle: {
            marginTop: 6,
          },
          tabBarShowLabel: true,
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardStackNavigator}
          options={{
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? {
                backgroundColor: '#E8EAF6',
                borderRadius: 14,
                padding: 10,
              } : { padding: 10 }}>
                <MaterialCommunityIcons name="view-dashboard" color={color} size={22} />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Conflits"
          component={DirectionConflictsScreen}
          options={{
            tabBarLabel: 'Conflits',
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? {
                backgroundColor: '#FFEBEE',
                borderRadius: 14,
                padding: 10,
              } : { padding: 10 }}>
                <MaterialCommunityIcons name="alert-circle" color={focused ? '#C62828' : color} size={22} />
              </View>
            ),
            tabBarActiveTintColor: '#C62828',
          }}
        />
        <Tab.Screen
          name="Tournées"
          component={DirectionToursScreen}
          options={{
            tabBarLabel: 'Tournées',
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? {
                backgroundColor: '#E8EAF6',
                borderRadius: 14,
                padding: 10,
              } : { padding: 10 }}>
                <MaterialCommunityIcons name="truck-fast" color={color} size={22} />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Paramètres"
          component={ParametresScreen}
          options={{
            tabBarLabel: 'Paramètres',
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? {
                backgroundColor: '#F5F5F5',
                borderRadius: 14,
                padding: 10,
              } : { padding: 10 }}>
                <MaterialCommunityIcons name="cog" color={color} size={22} />
              </View>
            ),
            tabBarActiveTintColor: '#64748b',
          }}
        />
      </Tab.Navigator>
    );
  }

  // Other roles - original tabs
  return (
    <Tab.Navigator
      tabBar={(props) => (
        <ControleTabBar {...props} showCreateShortcut={showControleCenterAction} />
      )}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 16,
          right: 16,
          elevation: 12,
          backgroundColor: '#ffffff',
          borderRadius: 28,
          height: 72,
          shadowColor: '#2563eb',
          shadowOffset: {
            width: 0,
            height: 10,
          },
          shadowOpacity: 0.2,
          shadowRadius: 16,
          borderTopWidth: 0,
          paddingHorizontal: 8,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
          height: 72,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarShowLabel: true
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
          component={DirectionStackNavigator}
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

const tabStyles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  inlineWrapper: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 0,
  },
  inlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 6,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  inlineTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  inlineIconWrapper: {
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },
  inlineLabelActive: {
    color: '#2563eb',
  },
  inlineCenterAction: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginTop: -28,
  },
  inlineCenterCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },
  inlineCenterLabel: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: '700',
    color: '#1D4ED8',
    textTransform: 'uppercase',
  },
});
