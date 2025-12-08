import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, Platform, RefreshControl } from 'react-native';
import { Text, Card, Button, Chip, Surface, Divider, ActivityIndicator, IconButton } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api';
import MatriculeText from '../components/MatriculeText';

interface ConflictDetail {
  conflict: {
    id: string;
    tourId: string;
    quantite_perdue: number;
    montant_dette_tnd: number;
    depasse_tolerance: boolean;
    is_surplus: boolean;
    statut: string;
    notes_direction: string | null;
    date_approbation_direction: string | null;
    createdAt: string;
  };
  tour: {
    id: string;
    matricule: string;
    secteur: string;
    nbre_caisses_depart: number;
    nbre_caisses_retour: number | null;
    date_sortie: string | null;
    date_entree: string | null;
    statut: string;
  };
  driverHistory: {
    driver: {
      id: string;
      nom_complet: string;
      matricule_par_defaut: string | null;
      tolerance_caisses_mensuelle: number;
    };
    stats: {
      total_tours: number;
      completed_tours: number;
      total_conflicts: number;
      resolved_conflicts: number;
      pending_conflicts: number;
      total_caisses_lost: number;
      total_debt_tnd: number;
    };
    conflicts: Array<{
      id: string;
      date: string;
      secteur: string;
      quantite_perdue: number;
      montant_dette_tnd: number;
      statut: string;
      depasse_tolerance: boolean;
      is_current: boolean;
    }>;
  } | null;
}

export default function ConflictDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { conflictId } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<ConflictDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadConflictDetail();
  }, [conflictId]);

  const loadConflictDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/dashboard/conflict/${conflictId}`);
      setData(response.data);
    } catch (error) {
      console.error('Error loading conflict detail:', error);
      showAlert('Erreur', 'Impossible de charger les détails du conflit');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConflictDetail();
    setRefreshing(false);
  };

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
      onOk?.();
    } else {
      Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
    }
  };

  const handleApprove = async () => {
    const doApprove = async () => {
      try {
        setActionLoading(true);
        await api.post(`/api/conflicts/${conflictId}/approve`, { notes: '' });
        showAlert('Succès', 'Conflit approuvé avec succès', () => navigation.goBack());
      } catch (error) {
        console.error('Error approving conflict:', error);
        showAlert('Erreur', 'Impossible d\'approuver le conflit');
      } finally {
        setActionLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Voulez-vous approuver ce conflit?')) {
        doApprove();
      }
    } else {
      Alert.alert('Confirmer', 'Voulez-vous approuver ce conflit?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Approuver', onPress: doApprove }
      ]);
    }
  };

  const handleReject = async () => {
    const doReject = async (notes: string) => {
      try {
        setActionLoading(true);
        await api.post(`/api/conflicts/${conflictId}/reject`, { notes });
        showAlert('Succès', 'Conflit rejeté', () => navigation.goBack());
      } catch (error) {
        console.error('Error rejecting conflict:', error);
        showAlert('Erreur', 'Impossible de rejeter le conflit');
      } finally {
        setActionLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      const notes = window.prompt('Raison du rejet (obligatoire):');
      if (notes && notes.trim()) {
        doReject(notes);
      } else if (notes !== null) {
        showAlert('Erreur', 'Une raison est obligatoire pour rejeter');
      }
    } else {
      Alert.prompt('Rejeter le conflit', 'Raison du rejet (obligatoire):', [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Rejeter', 
          style: 'destructive',
          onPress: (notes) => {
            if (notes && notes.trim()) {
              doReject(notes);
            } else {
              showAlert('Erreur', 'Une raison est obligatoire pour rejeter');
            }
          }
        }
      ], 'plain-text');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE': return '#FF9800';
      case 'APPROUVE': return '#4CAF50';
      case 'REJETE': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'EN_ATTENTE': return 'En attente';
      case 'APPROUVE': return 'Approuvé';
      case 'REJETE': return 'Rejeté';
      default: return statut;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C62828" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color="#F44336" />
        <Text style={styles.errorText}>Conflit non trouvé</Text>
        <Button mode="outlined" onPress={() => navigation.goBack()}>Retour</Button>
      </View>
    );
  }

  const { conflict, tour, driverHistory } = data;
  const isPending = conflict.statut === 'EN_ATTENTE';

  return (
    <View style={styles.container}>
      {/* Header */}
      <Surface style={[styles.header, conflict.depasse_tolerance && styles.headerUrgent]} elevation={2}>
        <View style={styles.headerContent}>
          <IconButton icon="arrow-left" iconColor="#fff" size={24} onPress={() => navigation.goBack()} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Détails du Conflit</Text>
            <Text style={styles.headerSubtitle}>{tour.secteur}</Text>
          </View>
          {conflict.depasse_tolerance && (
            <Chip style={styles.urgentChip} textStyle={styles.urgentChipText}>HORS TOLÉRANCE</Chip>
          )}
        </View>
      </Surface>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Conflict Summary Card */}
        <Card style={[styles.card, conflict.depasse_tolerance && styles.cardUrgent]}>
          <Card.Content>
            <View style={styles.conflictSummary}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, conflict.is_surplus ? styles.surplusValue : styles.lossValue]}>
                  {conflict.is_surplus ? '+' : '-'}{Math.abs(conflict.quantite_perdue)}
                </Text>
                <Text style={styles.summaryLabel}>Caisses</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, conflict.is_surplus ? styles.surplusValue : styles.lossValue]}>
                  {conflict.montant_dette_tnd}
                </Text>
                <Text style={styles.summaryLabel}>TND</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Chip style={[styles.statusChip, { backgroundColor: getStatusColor(conflict.statut) }]} textStyle={styles.statusChipText}>
                  {getStatusLabel(conflict.statut)}
                </Chip>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Tour Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>📋 Informations Tournée</Text>
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Véhicule:</Text>
              <MatriculeText matricule={tour.matricule} size="small" />
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Secteur:</Text>
              <Text style={styles.infoValue}>{tour.secteur}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Caisses départ:</Text>
              <Text style={styles.infoValue}>{tour.nbre_caisses_depart}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Caisses retour:</Text>
              <Text style={styles.infoValue}>{tour.nbre_caisses_retour ?? 'N/A'}</Text>
            </View>
            {tour.date_sortie && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Sortie:</Text>
                <Text style={styles.infoValue}>{formatDate(tour.date_sortie)}</Text>
              </View>
            )}
            {tour.date_entree && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Entrée:</Text>
                <Text style={styles.infoValue}>{formatDate(tour.date_entree)}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date conflit:</Text>
              <Text style={styles.infoValue}>{formatDate(conflict.createdAt)}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Driver History */}
        {driverHistory && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>👤 Historique Chauffeur</Text>
              <Divider style={styles.divider} />
              
              <View style={styles.driverHeader}>
                <Text style={styles.driverName}>{driverHistory.driver.nom_complet}</Text>
                {driverHistory.driver.matricule_par_defaut && (
                  <MatriculeText matricule={driverHistory.driver.matricule_par_defaut} size="small" />
                )}
              </View>

              {/* Driver Stats */}
              <View style={styles.statsGrid}>
                <Surface style={styles.statCard} elevation={1}>
                  <Text style={styles.statValue}>{driverHistory.stats.total_tours}</Text>
                  <Text style={styles.statLabel}>Tournées</Text>
                </Surface>
                <Surface style={[styles.statCard, driverHistory.stats.total_conflicts > 0 && styles.statCardWarning]} elevation={1}>
                  <Text style={[styles.statValue, driverHistory.stats.total_conflicts > 0 && styles.statValueWarning]}>
                    {driverHistory.stats.total_conflicts}
                  </Text>
                  <Text style={styles.statLabel}>Conflits</Text>
                </Surface>
                <Surface style={[styles.statCard, driverHistory.stats.pending_conflicts > 0 && styles.statCardDanger]} elevation={1}>
                  <Text style={[styles.statValue, driverHistory.stats.pending_conflicts > 0 && styles.statValueDanger]}>
                    {driverHistory.stats.pending_conflicts}
                  </Text>
                  <Text style={styles.statLabel}>En attente</Text>
                </Surface>
              </View>

              <View style={styles.statsGrid}>
                <Surface style={styles.statCard} elevation={1}>
                  <Text style={styles.statValue}>{driverHistory.stats.total_caisses_lost}</Text>
                  <Text style={styles.statLabel}>Caisses perdues</Text>
                </Surface>
                <Surface style={styles.statCard} elevation={1}>
                  <Text style={[styles.statValue, { color: '#C62828' }]}>{driverHistory.stats.total_debt_tnd}</Text>
                  <Text style={styles.statLabel}>TND dette</Text>
                </Surface>
                <Surface style={styles.statCard} elevation={1}>
                  <Text style={styles.statValue}>{driverHistory.driver.tolerance_caisses_mensuelle}</Text>
                  <Text style={styles.statLabel}>Tolérance/mois</Text>
                </Surface>
              </View>

              {/* Conflict History */}
              {driverHistory.conflicts.length > 0 && (
                <>
                  <Text style={styles.historyTitle}>📜 Historique des conflits</Text>
                  {driverHistory.conflicts.slice(0, 10).map((c) => (
                    <Surface 
                      key={c.id} 
                      style={[styles.historyItem, c.is_current && styles.historyItemCurrent]}
                      elevation={c.is_current ? 2 : 1}
                    >
                      <View style={styles.historyRow}>
                        <View style={styles.historyLeft}>
                          <Text style={styles.historyDate}>{formatShortDate(c.date)}</Text>
                          <Text style={styles.historySecteur}>{c.secteur}</Text>
                        </View>
                        <View style={styles.historyMiddle}>
                          <Text style={[styles.historyQuantity, c.quantite_perdue < 0 ? styles.surplusValue : styles.lossValue]}>
                            {c.quantite_perdue < 0 ? '+' : '-'}{Math.abs(c.quantite_perdue)} caisses
                          </Text>
                          <Text style={styles.historyAmount}>{c.montant_dette_tnd} TND</Text>
                        </View>
                        <Chip 
                          style={[styles.historyChip, { backgroundColor: getStatusColor(c.statut) }]}
                          textStyle={styles.historyChipText}
                        >
                          {getStatusLabel(c.statut)}
                        </Chip>
                      </View>
                      {c.depasse_tolerance && (
                        <Text style={styles.historyWarning}>⚠️ Hors tolérance</Text>
                      )}
                      {c.is_current && (
                        <Text style={styles.historyCurrentLabel}>← Conflit actuel</Text>
                      )}
                    </Surface>
                  ))}
                  {driverHistory.conflicts.length > 10 && (
                    <Text style={styles.moreConflicts}>
                      + {driverHistory.conflicts.length - 10} autres conflits
                    </Text>
                  )}
                </>
              )}
            </Card.Content>
          </Card>
        )}

        {/* No Driver Warning */}
        {!driverHistory && (
          <Card style={[styles.card, styles.warningCard]}>
            <Card.Content>
              <View style={styles.warningContent}>
                <MaterialCommunityIcons name="account-question" size={32} color="#FF9800" />
                <Text style={styles.warningText}>Chauffeur non assigné à cette tournée</Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Resolution Notes */}
        {conflict.notes_direction && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>📝 Notes Direction</Text>
              <Divider style={styles.divider} />
              <Text style={styles.notes}>{conflict.notes_direction}</Text>
              {conflict.date_approbation_direction && (
                <Text style={styles.resolutionDate}>
                  Résolu le {formatDate(conflict.date_approbation_direction)}
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Spacer for action buttons */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      {isPending && (
        <Surface style={styles.actionBar} elevation={4}>
          <Button
            mode="outlined"
            icon="close"
            textColor="#F44336"
            style={styles.actionButton}
            onPress={handleReject}
            disabled={actionLoading}
          >
            Rejeter
          </Button>
          <Button
            mode="contained"
            icon="check"
            buttonColor="#4CAF50"
            style={styles.actionButton}
            onPress={handleApprove}
            loading={actionLoading}
            disabled={actionLoading}
          >
            Approuver
          </Button>
        </Surface>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    marginBottom: 20,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#C62828',
    paddingTop: 48,
    paddingBottom: 16,
  },
  headerUrgent: {
    backgroundColor: '#B71C1C',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  urgentChip: {
    backgroundColor: '#FFD54F',
  },
  urgentChipText: {
    color: '#B71C1C',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
  },
  cardUrgent: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  conflictSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  lossValue: {
    color: '#F44336',
  },
  surplusValue: {
    color: '#4CAF50',
  },
  statusChip: {
    marginTop: 4,
  },
  statusChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  statCardWarning: {
    backgroundColor: '#FFF3E0',
  },
  statCardDanger: {
    backgroundColor: '#FFEBEE',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statValueWarning: {
    color: '#E65100',
  },
  statValueDanger: {
    color: '#C62828',
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  historyItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  historyItemCurrent: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 3,
    borderLeftColor: '#1976D2',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
  },
  historySecteur: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  historyMiddle: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  historyQuantity: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyAmount: {
    fontSize: 11,
    color: '#666',
  },
  historyChip: {
    height: 24,
  },
  historyChipText: {
    color: '#fff',
    fontSize: 9,
  },
  historyWarning: {
    fontSize: 11,
    color: '#E65100',
    marginTop: 4,
  },
  historyCurrentLabel: {
    fontSize: 11,
    color: '#1976D2',
    fontWeight: '600',
    marginTop: 4,
  },
  moreConflicts: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  warningCard: {
    backgroundColor: '#FFF8E1',
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    fontSize: 14,
    color: '#F57C00',
    marginLeft: 12,
    flex: 1,
  },
  notes: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  resolutionDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 6,
  },
});
