import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, TextInput as RNTextInput, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Button, Chip, FAB, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import MatriculeText from '../components/MatriculeText';

export default function AgentControleScreen() {
  const navigation = useNavigation<any>();
  const [tours, setTours] = useState<any[]>([]);
  const [filteredTours, setFilteredTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'retour'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [serieNumber, setSerieNumber] = useState('');
  const [uniqueNumber, setUniqueNumber] = useState('');

  useEffect(() => {
    loadTours();
  }, [filter]);

  const loadTours = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter === 'retour') {
        params.status = 'EN_ATTENTE_DECHARGEMENT';
      }
      
      const response = await api.get('/api/tours', { params });
      const data = response.data || [];
      setTours(data);
      setFilteredTours(data);
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de charger les tournées');
      console.error('Load tours error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTourStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'PREPARATION': 'Préparation',
      'PRET_A_PARTIR': 'Prêt à partir',
      'EN_TOURNEE': 'En tournée',
      'EN_ATTENTE_DECHARGEMENT': 'Attente déchargement',
      'EN_ATTENTE_HYGIENE': 'Attente hygiène',
      'TERMINEE': 'Terminé',
    };
    return labels[status] || status;
  };

  const getTourStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'PREPARATION': '#9E9E9E',
      'PRET_A_PARTIR': '#2196F3',
      'EN_TOURNEE': '#FF9800',
      'EN_ATTENTE_DECHARGEMENT': '#9C27B0',
      'EN_ATTENTE_HYGIENE': '#FFC107',
      'TERMINEE': '#4CAF50',
    };
    return colors[status] || '#757575';
  };

  const handleMatriculeSearch = (serie: string, unique: string) => {
    setSerieNumber(serie);
    setUniqueNumber(unique);
    const fullQuery = `${serie} ${unique}`.trim();
    setSearchQuery(fullQuery);
    
    if (fullQuery.length >= 3) {
      const searchTerm = fullQuery.toLowerCase().replace(/\s+/g, '');
      const filtered = tours.filter(tour => {
        const matriculeClean = tour.matricule_vehicule?.toLowerCase().replace(/\s+/g, '');
        return matriculeClean.includes(searchTerm) ||
               tour.driver?.nom_complet?.toLowerCase().includes(searchTerm);
      });
      setFilteredTours(filtered);
    } else {
      setFilteredTours(tours);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSerieNumber('');
    setUniqueNumber('');
    setFilteredTours(tours);
  };

  const handleCameraSearch = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission refusée', 'Vous devez autoriser l\'accès à la caméra pour utiliser cette fonctionnalité.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        Alert.alert(
          'Reconnaissance OCR',
          'La reconnaissance automatique de matricule sera disponible prochainement.\n\nVeuillez saisir le matricule manuellement pour le moment.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Erreur', 'Impossible d\'accéder à la caméra.');
    }
  };

  const displayTours = searchQuery.trim() ? filteredTours : tours;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>📋 Contrôle</Title>
        <Text style={styles.headerSubtitle}>Gestion des tournées</Text>
      </View>

      <View style={styles.content}>
        <Card style={styles.searchCard}>
          <Card.Content>
            <Text style={styles.searchLabel}>🔍 Recherche par matricule</Text>
            
            <View style={styles.searchContainer}>
              <View style={styles.plateSearchContainer}>
                <View style={styles.plateSearchInner}>
                  <RNTextInput
                    value={serieNumber}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/[^0-9]/g, '').slice(0, 3);
                      handleMatriculeSearch(cleaned, uniqueNumber);
                    }}
                    keyboardType="numeric"
                    maxLength={3}
                    style={styles.leftSearchInput}
                    placeholder="123"
                    placeholderTextColor="#666"
                  />
                  
                  <View style={styles.arabicSearchSection}>
                    <Text style={styles.arabicSearchText}>تونس</Text>
                  </View>
                  
                  <RNTextInput
                    value={uniqueNumber}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
                      handleMatriculeSearch(serieNumber, cleaned);
                    }}
                    keyboardType="numeric"
                    maxLength={4}
                    style={styles.rightSearchInput}
                    placeholder="4567"
                    placeholderTextColor="#666"
                  />
                </View>
              </View>
              
              <View style={styles.searchActions}>
                <IconButton
                  icon="camera"
                  size={28}
                  iconColor="#2196F3"
                  style={styles.cameraButton}
                  onPress={handleCameraSearch}
                />
                {searchQuery && (
                  <IconButton
                    icon="close-circle"
                    size={28}
                    iconColor="#F44336"
                    style={styles.clearButton}
                    onPress={clearSearch}
                  />
                )}
              </View>
            </View>
          </Card.Content>
        </Card>

      <View style={styles.filterContainer}>
        <Chip
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
          style={styles.filterChip}
          mode="outlined"
        >
          Toutes
        </Chip>
        <Chip
          selected={filter === 'retour'}
          onPress={() => setFilter('retour')}
          style={styles.filterChip}
          mode="outlined"
        >
          En retour
        </Chip>
      </View>

      <ScrollView style={styles.scrollView} refreshControl={
        <ScrollView onRefresh={loadTours} refreshing={loading} />
      }>
        {displayTours.length === 0 && !loading && (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>
                Aucune tournée trouvée
              </Text>
            </Card.Content>
          </Card>
        )}

        {displayTours.map((tour: any) => (
          <Card key={tour.id} style={styles.tourCard}>
            <Card.Content>
              <View style={styles.tourHeader}>
                <View style={styles.tourHeaderLeft}>
                  <Title style={styles.tourTitle}>{tour.driver.nom_complet}</Title>
                  <View style={styles.matriculePlateContainer}>
                    <MatriculeText matricule={tour.matricule_vehicule} size="medium" />
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getTourStatusColor(tour.statut) },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {getTourStatusLabel(tour.statut)}
                  </Text>
                </View>
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
                  <Text style={styles.conflictText}>
                    ⚠️ {tour.conflicts.length} conflit(s)
                  </Text>
                )}
              </View>
            </Card.Content>

            <Card.Actions style={styles.actions}>
              {tour.statut === 'EN_ATTENTE_DECHARGEMENT' && (
                <Button
                  mode="contained"
                  icon="package-down"
                  style={[styles.actionButton, { backgroundColor: '#9C27B0' }]}
                  onPress={() => navigation.navigate('AgentControleRetour', { tourId: tour.id })}
                >
                  Gérer Retour
                </Button>
              )}
            </Card.Actions>
          </Card>
        ))}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('AgentControleCreateTour')}
        label="Nouvelle"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
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
  filterContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  filterChip: {
    marginRight: 10,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  searchCard: {
    marginBottom: 15,
    elevation: 3,
    backgroundColor: '#fff',
  },
  searchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plateSearchContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 3,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    marginRight: 8,
  },
  plateSearchInner: {
    backgroundColor: '#000',
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 6,
    minHeight: 48,
  },
  leftSearchInput: {
    width: 65,
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    padding: 0,
    backgroundColor: 'transparent',
    fontFamily: 'monospace',
  },
  arabicSearchSection: {
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  arabicSearchText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  rightSearchInput: {
    width: 85,
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    padding: 0,
    backgroundColor: 'transparent',
    fontFamily: 'monospace',
  },
  searchActions: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    margin: 0,
    backgroundColor: '#E3F2FD',
    marginBottom: 4,
  },
  clearButton: {
    margin: 0,
    backgroundColor: '#FFEBEE',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  emptyCard: {
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
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
  matriculePlateContainer: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
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
  conflictText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: 'bold',
    marginTop: 5,
  },
  actions: {
    justifyContent: 'flex-end',
    paddingRight: 10,
  },
  actionButton: {
    marginLeft: 10,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});
