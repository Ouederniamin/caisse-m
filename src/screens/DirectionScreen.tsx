import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  Chip,
  DataTable,
  SegmentedButtons,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import MatriculeText from '../components/MatriculeText';

export default function DirectionScreen() {
  const navigation = useNavigation<any>();
  const [view, setView] = useState('conflicts');
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [tours, setTours] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [view]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (view === 'conflicts') {
        const response = await api.get('/api/conflicts', {
          params: { status: 'EN_ATTENTE' }
        });
        setConflicts(response.data || []);
      } else if (view === 'tours') {
        const response = await api.get('/api/tours');
        setTours(response.data || []);
        calculateStats(response.data || []);
      }
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de charger les données');
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (toursData: any[]) => {
    const stats = {
      total: toursData.length,
      enCours: toursData.filter(t => ['EN_TOURNEE', 'EN_ATTENTE_DECHARGEMENT'].includes(t.statut)).length,
      terminees: toursData.filter(t => t.statut === 'TERMINEE').length,
      conflits: toursData.filter(t => t.conflicts && t.conflicts.length > 0).length,
    };
    setStats(stats);
  };

  const handleApproveConflict = async (conflictId: string) => {
    Alert.alert(
      'Approuver le Conflit',
      'Confirmer que ce conflit a été résolu?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Approuver',
          onPress: async () => {
            try {
              await api.patch(`/api/conflicts/${conflictId}`, {
                statut: 'PAYEE',
                montant_paye_par_chauffeur: 0,
              });
              Alert.alert('✅ Approuvé', 'Le conflit a été marqué comme résolu');
              loadData();
            } catch (error: any) {
              Alert.alert('Erreur', 'Impossible d\'approuver le conflit');
            }
          },
        },
      ]
    );
  };

  const getTourStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'PREPARATION': '#9E9E9E',
      'PRET_A_PARTIR': '#2196F3',
      'EN_TOURNEE': '#FF9800',
      'EN_ATTENTE_DECHARGEMENT': '#9C27B0',
      'EN_ATTENTE_HYGIENE': '#FFC107',
      'EN_ATTENTE_NETTOYAGE': '#00BCD4',
      'TERMINEE': '#4CAF50',
    };
    return colors[status] || '#757575';
  };

  const renderConflicts = () => (
    <ScrollView>
      {conflicts.length === 0 && !loading && (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>
              ✅ Aucun conflit en attente
            </Text>
          </Card.Content>
        </Card>
      )}

      {conflicts.map((conflict: any) => (
        <Card key={conflict.id} style={styles.conflictCard}>
          <Card.Content>
            <View style={styles.conflictHeader}>
              <View style={styles.conflictHeaderLeft}>
                <Title style={styles.conflictTitle}>
                  {conflict.tour.driver.nom_complet}
                </Title>
                <View style={styles.matriculePlateContainer}>
                  <MatriculeText matricule={conflict.tour.matricule_vehicule} size="medium" />
                </View>
              </View>
              <Chip
                style={styles.conflictChip}
                textStyle={styles.conflictChipText}
              >
                {conflict.type_conflit}
              </Chip>
            </View>

            <View style={styles.conflictDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Départ:</Text>
                <Text style={styles.detailValue}>
                  {conflict.tour.nbre_caisses_depart} caisses
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Retour:</Text>
                <Text style={styles.detailValue}>
                  {conflict.tour.nbre_caisses_retour || 'N/A'} caisses
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Différence:</Text>
                <Text style={[styles.detailValue, styles.highlight]}>
                  {conflict.nbre_caisses_manquantes > 0 ? '-' : '+'} 
                  {Math.abs(conflict.nbre_caisses_manquantes)} caisses
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Valeur:</Text>
                <Text style={[styles.detailValue, styles.highlight]}>
                  {conflict.valeur_totale_tnd} TND
                </Text>
              </View>
            </View>

            {conflict.description_agent && (
              <Text style={styles.description}>
                📝 {conflict.description_agent}
              </Text>
            )}
          </Card.Content>

          <Card.Actions style={styles.actions}>
            <Button
              mode="contained"
              icon="check"
              style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => handleApproveConflict(conflict.id)}
            >
              Approuver
            </Button>
          </Card.Actions>
        </Card>
      ))}
    </ScrollView>
  );

  const renderTours = () => (
    <ScrollView>
      {stats && (
        <Card style={styles.statsCard}>
          <Card.Content>
            <Title style={styles.statsTitle}>📊 Statistiques</Title>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: '#FF9800' }]}>
                  {stats.enCours}
                </Text>
                <Text style={styles.statLabel}>En cours</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                  {stats.terminees}
                </Text>
                <Text style={styles.statLabel}>Terminées</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: '#F44336' }]}>
                  {stats.conflits}
                </Text>
                <Text style={styles.statLabel}>Conflits</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {tours.map((tour: any) => (
        <Card key={tour.id} style={styles.tourCard}>
          <Card.Content>
            <View style={styles.tourHeader}>
              <View style={styles.tourHeaderLeft}>
                <Title style={styles.tourTitle}>{tour.driver.nom_complet}</Title>
                <View style={styles.matriculePlateContainer}>
                  <MatriculeText matricule={tour.matricule_vehicule} size="medium" />
                </View>
              </View>
              <Chip
                style={[styles.statusChip, { backgroundColor: getTourStatusColor(tour.statut) }]}
                textStyle={styles.statusText}
              >
                {tour.statut}
              </Chip>
            </View>

            <View style={styles.tourDetails}>
              <Text style={styles.detailText}>
                🗺️ {tour.secteur.nom}
              </Text>
              <Text style={styles.detailText}>
                📦 Départ: {tour.nbre_caisses_depart} caisses
              </Text>
              {tour.nbre_caisses_retour !== null && (
                <Text style={styles.detailText}>
                  📦 Retour: {tour.nbre_caisses_retour} caisses
                </Text>
              )}
              {tour.conflicts && tour.conflicts.length > 0 && (
                <Text style={styles.conflictIndicator}>
                  ⚠️ {tour.conflicts.length} conflit(s)
                </Text>
              )}
            </View>
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>👔 Direction</Title>
        <Text style={styles.headerSubtitle}>Tableau de bord</Text>
      </View>

      <SegmentedButtons
        value={view}
        onValueChange={setView}
        buttons={[
          {
            value: 'conflicts',
            label: 'Conflits',
            icon: 'alert',
          },
          {
            value: 'tours',
            label: 'Tournées',
            icon: 'truck',
          },
        ]}
        style={styles.segmentedButtons}
      />

      <View style={styles.content}>
        {loading ? (
          <Card style={styles.loadingCard}>
            <Card.Content>
              <Text style={styles.loadingText}>Chargement...</Text>
            </Card.Content>
          </Card>
        ) : (
          <>
            {view === 'conflicts' && renderConflicts()}
            {view === 'tours' && renderTours()}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#9C27B0',
    paddingTop: 50,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  segmentedButtons: {
    margin: 15,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingCard: {
    marginTop: 20,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  emptyCard: {
    backgroundColor: '#E8F5E9',
  },
  emptyText: {
    textAlign: 'center',
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },
  conflictCard: {
    marginBottom: 15,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  conflictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  conflictTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  conflictHeaderLeft: {
    flex: 1,
  },
  matriculePlateContainer: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  conflictChip: {
    backgroundColor: '#FFEBEE',
  },
  conflictChipText: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: 'bold',
  },
  conflictDetails: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  highlight: {
    color: '#F44336',
    fontSize: 16,
  },
  description: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
  },
  actions: {
    justifyContent: 'flex-end',
    paddingRight: 10,
  },
  actionButton: {
    marginLeft: 10,
  },
  statsCard: {
    marginBottom: 20,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  tourCard: {
    marginBottom: 15,
    elevation: 3,
  },
  tourHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  tourTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  tourHeaderLeft: {
    flex: 1,
  },
  statusChip: {
    paddingHorizontal: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tourDetails: {
    marginTop: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  conflictIndicator: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: 'bold',
    marginTop: 5,
  },
});
