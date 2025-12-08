import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Alert, RefreshControl, AppState } from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  Chip,
  SegmentedButtons,
  IconButton,
  Surface,
  Badge,
  Snackbar,
  Portal,
  Modal,
  TextInput,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as Network from 'expo-network';
import offlineService, { KPIData, ConflictSummary, TourSummary, QueuedAction } from '../services/offlineService';
import { useAuth } from '../context/AuthContext';
import MatriculeText from '../components/MatriculeText';

export default function DirectionScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  
  // View state
  const [view, setView] = useState('kpis');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data state
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [conflicts, setConflicts] = useState<ConflictSummary[]>([]);
  const [tours, setTours] = useState<TourSummary[]>([]);
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([]);
  
  // Offline state
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // UI state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<ConflictSummary | null>(null);
  const [actionNotes, setActionNotes] = useState('');

  // Load data on mount and view change
  useEffect(() => {
    loadData();
    checkNetworkStatus();
    loadQueuedActions();
    loadLastSync();
  }, [view]);

  // Check network status periodically
  useEffect(() => {
    const interval = setInterval(checkNetworkStatus, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Sync when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        syncIfOnline();
      }
    });
    return () => subscription?.remove();
  }, []);

  const checkNetworkStatus = async () => {
    const online = await offlineService.checkOnlineStatus();
    setIsOnline(online);
    if (online && queuedActions.length > 0) {
      syncQueuedActions();
    }
  };

  const loadLastSync = async () => {
    const sync = await offlineService.getLastSync();
    setLastSync(sync);
  };

  const loadQueuedActions = async () => {
    const queue = await offlineService.getActionQueue();
    setQueuedActions(queue);
  };

  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    try {
      switch (view) {
        case 'kpis':
          const kpiResult = await offlineService.getKPIs(forceRefresh);
          setKpis(kpiResult.data);
          setFromCache(kpiResult.fromCache);
          break;
        case 'conflicts':
          const conflictsResult = await offlineService.getConflicts(forceRefresh);
          setConflicts(conflictsResult.data);
          setFromCache(conflictsResult.fromCache);
          break;
        case 'tours':
          const toursResult = await offlineService.getActiveTours(forceRefresh);
          setTours(toursResult.data);
          setFromCache(toursResult.fromCache);
          break;
      }
      await loadLastSync();
    } catch (error) {
      console.error('Load data error:', error);
      showSnackbar('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
    await syncIfOnline();
    setRefreshing(false);
  }, [view]);

  const syncIfOnline = async () => {
    const online = await offlineService.checkOnlineStatus();
    if (online && queuedActions.length > 0) {
      await syncQueuedActions();
    }
  };

  const syncQueuedActions = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await offlineService.syncQueuedActions();
      if (result.success > 0) {
        showSnackbar(`✅ ${result.success} action(s) synchronisée(s)`);
        await loadData(true);
      }
      if (result.failed > 0) {
        showSnackbar(`⚠️ ${result.failed} action(s) échouée(s)`);
      }
      await loadQueuedActions();
    } finally {
      setSyncing(false);
    }
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleApproveConflict = async (conflict: ConflictSummary) => {
    setSelectedConflict(conflict);
    setActionNotes('');
    setModalVisible(true);
  };

  const confirmApprove = async () => {
    if (!selectedConflict) return;
    
    setModalVisible(false);
    const success = await offlineService.approveConflict(selectedConflict.id, actionNotes);
    
    if (success) {
      showSnackbar('✅ Conflit approuvé');
      await loadData(true);
    } else {
      showSnackbar('📋 Action en file d\'attente (hors-ligne)');
      await loadQueuedActions();
      // Remove from local list optimistically
      setConflicts(prev => prev.filter(c => c.id !== selectedConflict.id));
    }
    
    setSelectedConflict(null);
    setActionNotes('');
  };

  const handleRejectConflict = async (conflict: ConflictSummary) => {
    Alert.prompt(
      'Rejeter le Conflit',
      'Ajouter une note (obligatoire pour rejet):',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Rejeter',
          style: 'destructive',
          onPress: async (notes: string | undefined) => {
            if (!notes || notes.trim() === '') {
              showSnackbar('⚠️ Note obligatoire pour rejeter');
              return;
            }
            const success = await offlineService.rejectConflict(conflict.id, notes);
            if (success) {
              showSnackbar('❌ Conflit rejeté');
              await loadData(true);
            } else {
              showSnackbar('📋 Action en file d\'attente (hors-ligne)');
              await loadQueuedActions();
              setConflicts(prev => prev.filter(c => c.id !== conflict.id));
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTourStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'PREPARATION': '#9E9E9E',
      'PRET_A_PARTIR': '#2196F3',
      'EN_TOURNEE': '#FF9800',
      'EN_ATTENTE_DECHARGEMENT': '#9C27B0',
      'EN_ATTENTE_HYGIENE': '#FFC107',
      'TERMINEE': '#4CAF50',
    };
    return colors[status] || '#757575';
  };

  // ============ RENDER KPIs ============
  const renderKPIs = () => (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {kpis ? (
        <>
          {/* Main KPI Cards */}
          <View style={styles.kpiGrid}>
            <Surface style={[styles.kpiCard, { backgroundColor: '#E3F2FD' }]} elevation={2}>
              <Text style={styles.kpiIcon}>🚚</Text>
              <Text style={[styles.kpiValue, { color: '#1976D2' }]}>{kpis.tours_actives}</Text>
              <Text style={styles.kpiLabel}>Tours Actives</Text>
            </Surface>
            
            <Surface style={[styles.kpiCard, { backgroundColor: '#FFF3E0' }]} elevation={2}>
              <Text style={styles.kpiIcon}>📦</Text>
              <Text style={[styles.kpiValue, { color: '#E65100' }]}>{kpis.caisses_dehors}</Text>
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

          {/* Quick Actions */}
          <Card style={styles.quickActionsCard}>
            <Card.Content>
              <Title style={styles.cardTitle}>⚡ Actions Rapides</Title>
              <View style={styles.quickActions}>
                <Button
                  mode="outlined"
                  icon="alert-circle"
                  onPress={() => setView('conflicts')}
                  style={styles.quickActionButton}
                  labelStyle={styles.quickActionLabel}
                >
                  Voir Conflits ({kpis.conflits_ouverts})
                </Button>
                <Button
                  mode="outlined"
                  icon="truck"
                  onPress={() => setView('tours')}
                  style={styles.quickActionButton}
                  labelStyle={styles.quickActionLabel}
                >
                  Voir Tournées ({kpis.tours_actives})
                </Button>
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
    </ScrollView>
  );

  // ============ RENDER CONFLICTS ============
  const renderConflicts = () => (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {conflicts.length === 0 && !loading ? (
        <Card style={styles.emptyCardSuccess}>
          <Card.Content>
            <Text style={styles.emptyTextSuccess}>✅ Aucun conflit en attente</Text>
          </Card.Content>
        </Card>
      ) : (
        conflicts.map((conflict) => (
          <Card 
            key={conflict.id} 
            style={[
              styles.conflictCard,
              conflict.depasse_tolerance && styles.conflictCardUrgent,
              conflict.is_surplus && styles.conflictCardSurplus
            ]}
          >
            <Card.Content>
              <View style={styles.conflictHeader}>
                <View style={styles.conflictInfo}>
                  <Text style={styles.conflictDriver}>{conflict.driver}</Text>
                  <MatriculeText matricule={conflict.matricule} size="small" />
                  <Text style={styles.conflictSecteur}>{conflict.secteur}</Text>
                </View>
                <View style={styles.conflictBadges}>
                  {conflict.depasse_tolerance && (
                    <Chip style={styles.urgentChip} textStyle={styles.chipText}>
                      HORS TOLÉRANCE
                    </Chip>
                  )}
                  {conflict.is_surplus && (
                    <Chip style={styles.surplusChip} textStyle={styles.chipText}>
                      SURPLUS
                    </Chip>
                  )}
                </View>
              </View>

              <View style={styles.conflictStats}>
                <View style={styles.conflictStat}>
                  <Text style={styles.statNumber}>
                    {conflict.is_surplus ? '+' : '-'}{Math.abs(conflict.quantite_perdue)}
                  </Text>
                  <Text style={styles.statDesc}>Caisses</Text>
                </View>
                <View style={styles.conflictStat}>
                  <Text style={styles.statNumber}>{conflict.montant_dette_tnd}</Text>
                  <Text style={styles.statDesc}>TND</Text>
                </View>
                <View style={styles.conflictStat}>
                  <Text style={styles.statDate}>{formatDate(conflict.createdAt)}</Text>
                </View>
              </View>
            </Card.Content>

            <Card.Actions style={styles.conflictActions}>
              <Button
                mode="outlined"
                icon="close"
                textColor="#F44336"
                onPress={() => handleRejectConflict(conflict)}
                style={styles.actionBtn}
              >
                Rejeter
              </Button>
              <Button
                mode="contained"
                icon="check"
                buttonColor="#4CAF50"
                onPress={() => handleApproveConflict(conflict)}
                style={styles.actionBtn}
              >
                Approuver
              </Button>
            </Card.Actions>
          </Card>
        ))
      )}
    </ScrollView>
  );

  // ============ RENDER TOURS ============
  const renderTours = () => (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {tours.length === 0 && !loading ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>Aucune tournée active</Text>
          </Card.Content>
        </Card>
      ) : (
        tours.map((tour) => (
          <Card key={tour.id} style={styles.tourCard}>
            <Card.Content>
              <View style={styles.tourHeader}>
                <View style={styles.tourInfo}>
                  <Text style={styles.tourDriver}>{tour.driver}</Text>
                  <MatriculeText matricule={tour.matricule} size="small" />
                </View>
                <Chip
                  style={[styles.statusChip, { backgroundColor: getTourStatusColor(tour.statut) }]}
                  textStyle={styles.statusChipText}
                >
                  {tour.statut.replace(/_/g, ' ')}
                </Chip>
              </View>

              <View style={styles.tourDetails}>
                <Text style={styles.tourDetail}>📍 {tour.secteur}</Text>
                <Text style={styles.tourDetail}>
                  📦 {tour.caisses_depart} caisses départ
                  {tour.caisses_retour !== null && ` → ${tour.caisses_retour} retour`}
                </Text>
                {tour.date_sortie && (
                  <Text style={styles.tourDetail}>
                    🚪 Sortie: {formatDate(tour.date_sortie)}
                  </Text>
                )}
                {tour.date_entree && (
                  <Text style={styles.tourDetail}>
                    🏠 Entrée: {formatDate(tour.date_entree)}
                  </Text>
                )}
              </View>
            </Card.Content>
          </Card>
        ))
      )}
    </ScrollView>
  );

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
          {queuedActions.length > 0 && (
            <Chip style={styles.queueChip} textStyle={styles.queueChipText}>
              {queuedActions.length} action(s) en attente
            </Chip>
          )}
        </Surface>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Title style={styles.headerTitle}>👔 Direction</Title>
          <Text style={styles.headerSubtitle}>Tableau de bord</Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton
            icon="bell"
            iconColor="#fff"
            size={24}
            onPress={() => navigation.navigate('Notifications')}
          />
          <IconButton
            icon="refresh"
            iconColor="#fff"
            size={24}
            onPress={onRefresh}
            disabled={loading || refreshing}
          />
        </View>
      </View>

      {/* Navigation */}
      <SegmentedButtons
        value={view}
        onValueChange={setView}
        buttons={[
          { value: 'kpis', label: 'KPIs', icon: 'chart-box' },
          { value: 'conflicts', label: 'Conflits', icon: 'alert-circle' },
          { value: 'tours', label: 'Tournées', icon: 'truck' },
        ]}
        style={styles.segmentedButtons}
      />

      {/* Content */}
      <View style={styles.content}>
        {view === 'kpis' && renderKPIs()}
        {view === 'conflicts' && renderConflicts()}
        {view === 'tours' && renderTours()}
      </View>

      {/* Approve Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <Title style={styles.modalTitle}>Approuver le Conflit</Title>
              {selectedConflict && (
                <>
                  <Text style={styles.modalInfo}>
                    {selectedConflict.driver} - {selectedConflict.quantite_perdue} caisses
                  </Text>
                  <TextInput
                    label="Notes (optionnel)"
                    value={actionNotes}
                    onChangeText={setActionNotes}
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    style={styles.modalInput}
                  />
                </>
              )}
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => setModalVisible(false)}>Annuler</Button>
              <Button mode="contained" onPress={confirmApprove}>Confirmer</Button>
            </Card.Actions>
          </Card>
        </Modal>
      </Portal>

      {/* Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
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
    flexWrap: 'wrap',
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
  queueChip: {
    backgroundColor: '#FFE0B2',
    marginTop: 5,
  },
  queueChipText: {
    color: '#E65100',
    fontSize: 12,
  },
  header: {
    backgroundColor: '#9C27B0',
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
  segmentedButtons: {
    margin: 15,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  
  // KPI Styles
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  kpiCard: {
    width: '48%',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  kpiIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  kpiLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  alertBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#F44336',
  },
  statsCard: {
    marginBottom: 15,
    borderRadius: 12,
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
  quickActionsCard: {
    marginBottom: 15,
    borderRadius: 12,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  quickActionLabel: {
    fontSize: 12,
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
  emptyCardSuccess: {
    marginTop: 20,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
  },
  emptyTextSuccess: {
    textAlign: 'center',
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },

  // Conflict Styles
  conflictCard: {
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  conflictCardUrgent: {
    borderLeftColor: '#F44336',
    backgroundColor: '#FFF8F8',
  },
  conflictCardSurplus: {
    borderLeftColor: '#9C27B0',
    backgroundColor: '#FDF4FF',
  },
  conflictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  conflictInfo: {
    flex: 1,
  },
  conflictDriver: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  conflictSecteur: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  conflictBadges: {
    alignItems: 'flex-end',
  },
  urgentChip: {
    backgroundColor: '#FFEBEE',
    marginBottom: 4,
  },
  surplusChip: {
    backgroundColor: '#F3E5F5',
  },
  chipText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  conflictStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  conflictStat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statDesc: {
    fontSize: 11,
    color: '#666',
  },
  statDate: {
    fontSize: 12,
    color: '#666',
  },
  conflictActions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  actionBtn: {
    marginLeft: 8,
  },

  // Tour Styles
  tourCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  tourHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tourInfo: {
    flex: 1,
  },
  tourDriver: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statusChip: {
    paddingHorizontal: 8,
  },
  statusChipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tourDetails: {
    marginTop: 10,
  },
  tourDetail: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
  },

  // Modal Styles
  modalContainer: {
    margin: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    marginTop: 10,
  },

  // Snackbar
  snackbar: {
    marginBottom: 20,
  },
});
