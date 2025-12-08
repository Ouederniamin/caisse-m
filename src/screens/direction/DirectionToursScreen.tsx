import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  Title,
  Chip,
  SegmentedButtons,
} from 'react-native-paper';
import offlineService, { TourSummary } from '../../services/offlineService';
import MatriculeText from '../../components/MatriculeText';

export default function DirectionToursScreen() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tours, setTours] = useState<TourSummary[]>([]);
  const [filter, setFilter] = useState('all');

  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const toursResult = await offlineService.getActiveTours(forceRefresh);
      setTours(toursResult.data);
    } catch (error) {
      console.error('Load tours error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  const getTourStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'PREPARATION': '#9E9E9E',
      'PRET_A_PARTIR': '#2196F3',
      'EN_TOURNEE': '#3F51B5',
      'EN_ATTENTE_DECHARGEMENT': '#9C27B0',
      'EN_ATTENTE_HYGIENE': '#00BCD4',
      'TERMINEE': '#4CAF50',
    };
    return colors[status] || '#757575';
  };

  const filteredTours = filter === 'all' 
    ? tours 
    : tours.filter(t => {
        if (filter === 'active') return ['EN_TOURNEE', 'PRET_A_PARTIR', 'PREPARATION'].includes(t.statut);
        if (filter === 'waiting') return ['EN_ATTENTE_DECHARGEMENT', 'EN_ATTENTE_HYGIENE'].includes(t.statut);
        if (filter === 'done') return t.statut === 'TERMINEE';
        return true;
      });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Title style={styles.headerTitle}>🚚 Tournées</Title>
          <Text style={styles.headerSubtitle}>{tours.length} tournées aujourd'hui</Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={filter}
          onValueChange={setFilter}
          buttons={[
            { value: 'all', label: 'Toutes' },
            { value: 'active', label: 'En cours' },
            { value: 'waiting', label: 'Attente' },
            { value: 'done', label: 'Terminées' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredTours.length === 0 && !loading ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>
                {filter === 'all' ? 'Aucune tournée active' : 'Aucune tournée dans cette catégorie'}
              </Text>
            </Card.Content>
          </Card>
        ) : (
          filteredTours.map((tour) => (
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
  header: {
    backgroundColor: '#3F51B5',
    paddingTop: 50,
    paddingBottom: 25,
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
  filterContainer: {
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  segmentedButtons: {
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 15,
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
});
