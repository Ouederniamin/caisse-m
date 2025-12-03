import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, RefreshControl, TextInput as RNTextInput, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Button, Chip, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import MatriculeText from '../components/MatriculeText';

export default function AgentHygieneScreen() {
  const navigation = useNavigation<any>();
  const [tours, setTours] = useState<any[]>([]);
  const [filteredTours, setFilteredTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [serieNumber, setSerieNumber] = useState('');
  const [uniqueNumber, setUniqueNumber] = useState('');

  useEffect(() => {
    loadTours();
  }, []);

  const loadTours = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/tours', {
        params: { status: 'EN_ATTENTE_HYGIENE' }
      });
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
        <Title style={styles.headerTitle}>🧤 Hygiène</Title>
        <Text style={styles.headerSubtitle}>Contrôles d'hygiène</Text>
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
                  iconColor="#4CAF50"
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

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadTours} />
        }
      >
        {displayTours.length === 0 && !loading && (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>
                ✅ Aucune tournée en attente d'inspection hygiène
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
                <Chip
                  style={styles.statusChip}
                  textStyle={styles.statusText}
                >
                  En attente
                </Chip>
              </View>

              <View style={styles.tourDetails}>
                <Text style={styles.detailText}>
                  🗺️ {tour.secteur.nom}
                </Text>
                <Text style={styles.detailText}>
                  📦 Retour: {tour.nbre_caisses_retour || 'N/A'} caisses
                </Text>
                {tour.conflicts && tour.conflicts.length > 0 && (
                  <Text style={styles.conflictText}>
                    ⚠️ {tour.conflicts.length} conflit(s)
                  </Text>
                )}
              </View>
            </Card.Content>

            <Card.Actions style={styles.actions}>
              <Button
                mode="contained"
                icon="clipboard-check"
                style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                onPress={() => navigation.navigate('AgentHygieneDetail', { tourId: tour.id })}
              >
                Contrôler
              </Button>
            </Card.Actions>
          </Card>
        ))}
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
    backgroundColor: '#4CAF50',
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
    backgroundColor: '#E8F5E9',
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
    backgroundColor: '#E8F5E9',
  },
  emptyText: {
    textAlign: 'center',
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
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
  statusChip: {
    backgroundColor: '#FFC107',
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
});
