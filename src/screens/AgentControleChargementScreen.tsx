import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Title,
  Card,
  Button,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MatriculeText from '../components/MatriculeText';

// This screen shows tours waiting for chargement (Status: PESEE_VIDE)
// Agent Contrôle selects a tour and proceeds to load it

export default function AgentControleChargementScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadPendingTours();
    }, [])
  );

  const loadPendingTours = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/tours', {
        params: { status: 'PESEE_VIDE' }
      });
      setTours(response.data);
    } catch (error) {
      console.error('Error loading tours:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPendingTours();
    setRefreshing(false);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderTourCard = (tour: any) => {
    const timeSincePesee = tour.date_pesee_vide 
      ? Math.round((Date.now() - new Date(tour.date_pesee_vide).getTime()) / 60000)
      : 0;

    return (
      <Card key={tour.id} style={styles.tourCard}>
        <Card.Content>
          <View style={styles.tourHeader}>
            <View style={styles.tourHeaderLeft}>
              <Text style={styles.driverName}>{tour.driver?.nom_complet || 'Chauffeur'}</Text>
              <MatriculeText matricule={tour.matricule_vehicule} size="small" />
            </View>
            <View style={styles.statusBadge}>
              <MaterialCommunityIcons name="scale" size={14} color="#fff" />
              <Text style={styles.statusText}>Pesée faite</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="weight-kilogram" size={18} color="#9C27B0" />
              <View>
                <Text style={styles.infoLabel}>Poids à vide</Text>
                <Text style={styles.infoValue}>{tour.poids_a_vide || 0} kg</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="clock-outline" size={18} color="#FF9800" />
              <View>
                <Text style={styles.infoLabel}>Pesée à</Text>
                <Text style={styles.infoValue}>{formatTime(tour.date_pesee_vide || tour.createdAt)}</Text>
              </View>
            </View>
          </View>

          {timeSincePesee > 30 && (
            <View style={styles.warningBanner}>
              <MaterialCommunityIcons name="alert" size={16} color="#E65100" />
              <Text style={styles.warningText}>En attente depuis {timeSincePesee} min</Text>
            </View>
          )}
        </Card.Content>
        
        <Card.Actions style={styles.cardActions}>
          <Button
            mode="contained"
            icon="package-variant"
            style={styles.loadButton}
            labelStyle={styles.loadButtonLabel}
            onPress={() => navigation.navigate('ChargementDetail', { tourId: tour.id })}
          >
            Charger
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="package-variant" size={36} color="#fff" />
          </View>
          <View style={styles.headerTextContainer}>
            <Title style={styles.headerTitle}>Chargement</Title>
            <Text style={styles.headerSubtitle}>Camions en attente de chargement</Text>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{tours.length}</Text>
            <Text style={styles.statLabel}>En attente</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3F51B5" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {tours.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content style={styles.emptyContent}>
                  <MaterialCommunityIcons name="truck-check" size={48} color="#BDBDBD" />
                  <Text style={styles.emptyTitle}>Aucun camion en attente</Text>
                  <Text style={styles.emptyText}>
                    Les camions pesés par la sécurité apparaîtront ici
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              tours.map(renderTourCard)
            )}
          </ScrollView>
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
    backgroundColor: '#3F51B5',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 6,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  emptyCard: {
    marginTop: 20,
    backgroundColor: '#E8EAF6',
    borderRadius: 12,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3F51B5',
    marginTop: 15,
  },
  emptyText: {
    textAlign: 'center',
    color: '#5C6BC0',
    fontSize: 14,
    marginTop: 8,
  },
  tourCard: {
    marginBottom: 15,
    borderRadius: 12,
    elevation: 3,
  },
  tourHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  tourHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#9C27B0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 11,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  warningText: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '500',
  },
  cardActions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  loadButton: {
    backgroundColor: '#3F51B5',
    borderRadius: 8,
    flex: 1,
  },
  loadButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
