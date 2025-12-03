import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, RefreshControl, TextInput as RNTextInput, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Button, Searchbar, Chip, SegmentedButtons, FAB, IconButton } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import MatriculeText from '../components/MatriculeText';

export default function SecuriteScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [serieNumber, setSerieNumber] = useState('');
  const [uniqueNumber, setUniqueNumber] = useState('');
  const [tours, setTours] = useState<any[]>([]);
  const [filteredTours, setFilteredTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'sortie' | 'entree' | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAllTours();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [view, tours]);

  const loadAllTours = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/tours');
      setTours(response.data || []);
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de charger les tournées');
      console.error('Load tours error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (searchQuery.trim()) {
      searchTours(searchQuery);
    } else {
      loadAllTours();
    }
  };

  const applyFilters = () => {
    let filtered = [...tours];
    
    if (view === 'sortie') {
      filtered = filtered.filter(t => 
        t.statut === 'PRET_A_PARTIR' || t.statut === 'PREPARATION'
      );
    } else if (view === 'entree') {
      filtered = filtered.filter(t => 
        t.statut === 'EN_ATTENTE_DECHARGEMENT' || t.statut === 'DE_RETOUR'
      );
    }
    
    setFilteredTours(filtered);
  };

  const searchTours = async (query: string) => {
    if (!query.trim()) {
      setTours([]);
      setFilteredTours([]);
      loadAllTours();
      return;
    }

    setLoading(true);
    try {
      const response = await api.get('/api/tours', {
        params: { matricule: query.trim() }
      });
      const results = response.data.tours || response.data || [];
      setTours(results);
      setFilteredTours(results);
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de récupérer les tournées');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length >= 3) {
      searchTours(query);
    } else if (query.trim().length === 0) {
      loadAllTours();
    }
  };

  const handleMatriculeSearch = (serie: string, unique: string) => {
    setSerieNumber(serie);
    setUniqueNumber(unique);
    const fullQuery = `${serie} ${unique}`.trim();
    setSearchQuery(fullQuery);
    
    if (fullQuery.length >= 3) {
      searchTours(fullQuery);
    } else if (fullQuery.length === 0) {
      loadAllTours();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSerieNumber('');
    setUniqueNumber('');
    loadAllTours();
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

  const getTourStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'PREPARATION': 'Préparation',
      'PRET_A_PARTIR': 'Prêt à partir',
      'EN_TOURNEE': 'En tournée',
      'EN_ATTENTE_DECHARGEMENT': 'En attente déchargement',
      'DE_RETOUR': 'De retour',
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
      'DE_RETOUR': '#9C27B0',
      'EN_ATTENTE_HYGIENE': '#FFC107',
      'TERMINEE': '#4CAF50',
    };
    return colors[status] || '#757575';
  };

  const displayTours = searchQuery.trim() ? tours : filteredTours;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>⚖️ Sécurité</Title>
        <Text style={styles.headerSubtitle}>Pesées sortie & entrée</Text>
      </View>

      <View style={styles.content}>
        <Card style={styles.searchCard}>
          <Card.Content>
            <Text style={styles.searchLabel}>🔍 Recherche par matricule</Text>
            
            {/* License Plate Style Search */}
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
                  iconColor="#FF9800"
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

        {!searchQuery && (
          <SegmentedButtons
            value={view}
            onValueChange={(value) => setView(value as 'sortie' | 'entree' | 'all')}
            buttons={[
              {
                value: 'sortie',
                label: 'Sorties',
                icon: 'arrow-up-bold',
              },
              {
                value: 'all',
                label: 'Toutes',
                icon: 'view-list',
              },
              {
                value: 'entree',
                label: 'Entrées',
                icon: 'arrow-down-bold',
              },
            ]}
            style={styles.segmentedButtons}
          />
        )}

        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {displayTours.length === 0 && !loading && (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>
                  {searchQuery.trim() 
                    ? '🔍 Aucune tournée trouvée pour ce matricule'
                    : '📋 Aucune tournée disponible'}
                </Text>
                {searchQuery.trim() && (
                  <Button 
                    mode="text" 
                    onPress={clearSearch}
                    style={styles.clearButton}
                  >
                    Effacer la recherche
                  </Button>
                )}
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
                      <MatriculeText matricule={tour.matricule_vehicule} size="large" />
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
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>🗺️</Text>
                    <Text style={styles.detailText}>{tour.secteur.nom}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📦</Text>
                    <Text style={styles.detailText}>
                      {tour.nbre_caisses_depart || tour.nombre_caisses_livrees} caisses
                    </Text>
                  </View>
                  {tour.poids_brut_securite_sortie && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>⚖️</Text>
                      <Text style={styles.detailText}>
                        Sortie: {tour.poids_brut_securite_sortie} kg
                      </Text>
                    </View>
                  )}
                  {tour.poids_brut_securite_entree && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>⚖️</Text>
                      <Text style={styles.detailText}>
                        Entrée: {tour.poids_brut_securite_entree} kg
                      </Text>
                    </View>
                  )}
                  {tour.poids_brut_securite_sortie && tour.poids_brut_securite_entree && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>📊</Text>
                      <Text style={[styles.detailText, styles.boldText]}>
                        Différence: {(tour.poids_brut_securite_sortie - tour.poids_brut_securite_entree).toFixed(2)} kg
                      </Text>
                    </View>
                  )}
                </View>
              </Card.Content>

              <Card.Actions style={styles.actions}>
                {(tour.statut === 'PRET_A_PARTIR' || tour.statut === 'PREPARATION') && !tour.poids_brut_securite_sortie && (
                  <Button
                    mode="contained"
                    icon="scale"
                    style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
                    onPress={() => navigation.navigate('PeseeSortie', { tourId: tour.id })}
                  >
                    Pesée Sortie
                  </Button>
                )}

                {(tour.statut === 'EN_ATTENTE_DECHARGEMENT' || tour.statut === 'DE_RETOUR') && !tour.poids_brut_securite_entree && (
                  <Button
                    mode="contained"
                    icon="scale"
                    style={[styles.actionButton, { backgroundColor: '#9C27B0' }]}
                    onPress={() => navigation.navigate('PeseeEntree', { tourId: tour.id })}
                  >
                    Pesée Entrée
                  </Button>
                )}

                {tour.poids_brut_securite_sortie && tour.poids_brut_securite_entree && (
                  <Chip 
                    icon="check-circle" 
                    style={styles.completedChip}
                    textStyle={styles.completedChipText}
                  >
                    Pesées complètes
                  </Chip>
                )}
              </Card.Actions>
            </Card>
          ))}
        </ScrollView>

        {!searchQuery && displayTours.length > 0 && (
          <Card style={styles.statsCard}>
            <Card.Content>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {displayTours.filter(t => !t.poids_brut_securite_sortie && (t.statut === 'PRET_A_PARTIR' || t.statut === 'PREPARATION')).length}
                  </Text>
                  <Text style={styles.statLabel}>En attente sortie</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {displayTours.filter(t => !t.poids_brut_securite_entree && (t.statut === 'EN_ATTENTE_DECHARGEMENT' || t.statut === 'DE_RETOUR')).length}
                  </Text>
                  <Text style={styles.statLabel}>En attente entrée</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {displayTours.filter(t => t.poids_brut_securite_sortie && t.poids_brut_securite_entree).length}
                  </Text>
                  <Text style={styles.statLabel}>Complètes</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
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
    backgroundColor: '#FF9800',
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
  content: {
    flex: 1,
    padding: 20,
  },
  searchCard: {
    marginBottom: 15,
    elevation: 3,
  },
  searchBar: {
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
    backgroundColor: '#FFF3E0',
    marginBottom: 4,
  },
  clearButton: {
    margin: 0,
    backgroundColor: '#FFEBEE',
    marginTop: 4,
  },
  searchHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  segmentedButtons: {
    marginBottom: 15,
  },
  scrollView: {
    flex: 1,
  },
  emptyCard: {
    marginTop: 20,
    backgroundColor: '#E3F2FD',
  },
  emptyText: {
    textAlign: 'center',
    color: '#1976D2',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    marginTop: 10,
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
  tourMatricule: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailIcon: {
    fontSize: 14,
    marginRight: 8,
    width: 20,
  },
  detailText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#333',
  },
  actions: {
    justifyContent: 'flex-end',
    paddingRight: 10,
  },
  actionButton: {
    marginLeft: 10,
  },
  completedChip: {
    backgroundColor: '#E8F5E9',
    marginLeft: 10,
  },
  completedChipText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsCard: {
    marginTop: 15,
    elevation: 3,
    backgroundColor: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
});
