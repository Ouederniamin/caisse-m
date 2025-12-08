import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, AppState } from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  Surface,
  Badge,
  IconButton,
  Chip,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import offlineService, { KPIData, QueuedAction } from '../../services/offlineService';
import { useAuth } from '../../context/AuthContext';

export default function DirectionDashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([]);
  const [fromCache, setFromCache] = useState(false);

  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const kpiResult = await offlineService.getKPIs(forceRefresh);
      setKpis(kpiResult.data);
      setFromCache(kpiResult.fromCache);
      
      const sync = await offlineService.getLastSync();
      setLastSync(sync);
      
      const queue = await offlineService.getActionQueue();
      setQueuedActions(queue);
      
      const online = await offlineService.checkOnlineStatus();
      setIsOnline(online);
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={styles.container}>
      {/* Offline Banner */}
      {(!isOnline || fromCache) && (
        <Surface style={styles.offlineBanner} elevation={2}>
          <Text style={styles.offlineBannerText}>
            {!isOnline ? '📵 Mode Hors-Ligne' : '📋 Données en cache'}
          </Text>
          {lastSync && (
            <Text style={styles.lastSyncText}>
              Dernière sync: {formatDate(lastSync)}
            </Text>
          )}
        </Surface>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Title style={styles.headerTitle}>Tableau de Bord</Title>
          <Text style={styles.headerSubtitle}>Vue d'ensemble</Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton
            icon="bell"
            iconColor="#fff"
            size={24}
            onPress={() => navigation.navigate('Notifications')}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {kpis ? (
          <>
            {/* Main KPI Cards */}
            <View style={styles.kpiGrid}>
              <Surface style={[styles.kpiCard, { backgroundColor: '#E8EAF6' }]} elevation={2}>
                <Text style={styles.kpiIcon}>🚚</Text>
                <Text style={[styles.kpiValue, { color: '#3F51B5' }]}>{kpis.tours_actives}</Text>
                <Text style={styles.kpiLabel}>Tours Actives</Text>
              </Surface>
              
              <Surface style={[styles.kpiCard, { backgroundColor: '#E0F7FA' }]} elevation={2}>
                <Text style={styles.kpiIcon}>📦</Text>
                <Text style={[styles.kpiValue, { color: '#006064' }]}>{kpis.caisses_dehors}</Text>
                <Text style={styles.kpiLabel}>Caisses Dehors</Text>
              </Surface>
              
              <Surface style={[styles.kpiCard, { backgroundColor: '#FFEBEE' }]} elevation={2}>
                <Text style={styles.kpiIcon}>⚠️</Text>
                <Text style={[styles.kpiValue, { color: '#C62828' }]}>{kpis.conflits_ouverts}</Text>
                <Text style={styles.kpiLabel}>Conflits Ouverts</Text>
                {kpis.conflits_hors_tolerance > 0 && (
                  <Badge style={styles.alertBadge}>{kpis.conflits_hors_tolerance}</Badge>
                )}
              </Surface>
              
              <Surface style={[styles.kpiCard, { backgroundColor: '#E8F5E9' }]} elevation={2}>
                <Text style={styles.kpiIcon}>⚖️</Text>
                <Text style={[styles.kpiValue, { color: '#2E7D32' }]}>{kpis.kilos_livres}</Text>
                <Text style={styles.kpiLabel}>Kilos Livrés</Text>
              </Surface>
            </View>

            {/* Navigation Cards - removed since we have tabs now */}
            
            {/* Secondary Stats */}
            <Card style={styles.statsCard}>
              <Card.Content>
                <Title style={styles.cardTitle}>📊 Aujourd'hui</Title>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{kpis.tours_terminees_aujourdhui}</Text>
                    <Text style={styles.statLabel}>Terminées</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{kpis.tours_en_attente_retour}</Text>
                    <Text style={styles.statLabel}>Attente Retour</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{kpis.tours_en_attente_hygiene}</Text>
                    <Text style={styles.statLabel}>Attente Hygiène</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          </>
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>
                {loading ? 'Chargement...' : 'Aucune donnée disponible'}
              </Text>
            </Card.Content>
          </Card>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  offlineBanner: {
    backgroundColor: '#FFF3E0',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offlineBannerText: {
    color: '#E65100',
    fontWeight: 'bold',
    fontSize: 14,
  },
  lastSyncText: {
    color: '#666',
    fontSize: 12,
  },
  header: {
    backgroundColor: '#3F51B5',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  kpiCard: {
    width: '48%',
    padding: 15,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  kpiLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  alertBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F44336',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
    marginLeft: 4,
  },
  navCard: {
    marginBottom: 12,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: '#fff',
  },
  navCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  navIcon: {
    fontSize: 24,
  },
  navTextContainer: {
    flex: 1,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  navSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  statsCard: {
    marginTop: 8,
    marginBottom: 15,
    borderRadius: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  emptyCard: {
    marginTop: 20,
    borderRadius: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
});
