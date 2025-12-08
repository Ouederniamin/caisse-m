import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import {
  Text,
  Surface,
  IconButton,
  Badge,
  Divider,
  ActivityIndicator,
  Button,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: string;
}

export default function NotificationsScreen() {
  const theme = useTheme();
  const { userToken } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Erreur fetch notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userToken]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erreur mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Erreur mark all as read:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const getNotificationIcon = (message: string) => {
    if (message.includes('Tolérance') || message.includes('hors')) {
      return 'alert-circle';
    }
    if (message.includes('Surplus')) {
      return 'alert-octagon';
    }
    if (message.includes('Hygiène') || message.includes('Rejet')) {
      return 'close-circle';
    }
    if (message.includes('manquante')) {
      return 'package-variant-closed-remove';
    }
    return 'bell';
  };

  const getNotificationColor = (message: string, isRead: boolean) => {
    if (isRead) return theme.colors.surfaceVariant;
    
    if (message.includes('Tolérance') || message.includes('Surplus')) {
      return '#FFE5E5'; // Light red
    }
    if (message.includes('Hygiène') || message.includes('Rejet')) {
      return '#E0F7FA'; // Light cyan
    }
    return '#E3F2FD'; // Light blue
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <Surface
      style={[
        styles.notificationCard,
        { backgroundColor: getNotificationColor(item.message, item.isRead) },
      ]}
      elevation={item.isRead ? 0 : 1}
    >
      <View style={styles.notificationRow}>
        <View style={styles.iconContainer}>
          <IconButton
            icon={getNotificationIcon(item.message)}
            size={24}
            iconColor={item.isRead ? theme.colors.outline : theme.colors.primary}
          />
          {!item.isRead && (
            <Badge size={8} style={styles.unreadBadge} />
          )}
        </View>
        
        <View style={styles.notificationContent}>
          <Text
            variant="bodyMedium"
            style={[
              styles.notificationMessage,
              item.isRead && styles.readMessage,
            ]}
          >
            {item.message}
          </Text>
          <Text variant="bodySmall" style={styles.notificationTime}>
            {formatDate(item.createdAt)}
          </Text>
        </View>

        {!item.isRead && (
          <IconButton
            icon="check"
            size={20}
            onPress={() => markAsRead(item.id)}
            iconColor={theme.colors.primary}
          />
        )}
      </View>
    </Surface>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text variant="headlineMedium" style={styles.title}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <Badge size={22} style={styles.countBadge}>
              {unreadCount}
            </Badge>
          )}
        </View>
        
        {unreadCount > 0 && (
          <Button
            mode="text"
            onPress={markAllAsRead}
            compact
          >
            Tout marquer lu
          </Button>
        )}
      </View>

      <Divider />

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconButton
            icon="bell-off-outline"
            size={64}
            iconColor={theme.colors.outline}
          />
          <Text variant="titleMedium" style={styles.emptyText}>
            Aucune notification
          </Text>
          <Text variant="bodySmall" style={styles.emptySubtext}>
            Les alertes apparaîtront ici
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: '#D32F2F',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    marginTop: 8,
  },
  emptySubtext: {
    color: '#999',
    marginTop: 4,
  },
  listContent: {
    padding: 12,
  },
  notificationCard: {
    borderRadius: 12,
    padding: 8,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#D32F2F',
  },
  notificationContent: {
    flex: 1,
    paddingVertical: 4,
  },
  notificationMessage: {
    lineHeight: 20,
  },
  readMessage: {
    color: '#666',
  },
  notificationTime: {
    color: '#999',
    marginTop: 2,
  },
  separator: {
    height: 8,
  },
});
