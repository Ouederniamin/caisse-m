import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Alert, RefreshControl, TextInput as RNTextInput, TouchableOpacity, Platform } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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

  // Refresh tours when screen comes into focus (after returning from detail)
  useFocusEffect(
    useCallback(() => {
      loadTours();
    }, [])
  );

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
      const msg = 'Impossible de charger les tournées';
      if (Platform.OS === 'web') {
        window.alert('Erreur: ' + msg);
      } else {
        Alert.alert('Erreur', msg);
      }
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
    
    // Search if any field has input
    if (serie.trim() || unique.trim()) {
      const filtered = tours.filter(tour => {
        const matriculeNumbers = tour.matricule_vehicule?.replace(/[^0-9]/g, '') || '';
        const matriculeSerie = matriculeNumbers.slice(0, 3);
        const matriculeUnique = matriculeNumbers.slice(3);
        
        const serieMatch = !serie.trim() || matriculeSerie.includes(serie.trim());
        const uniqueMatch = !unique.trim() || matriculeUnique.includes(unique.trim());
        
        return serieMatch && uniqueMatch;
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
        const msg = 'Vous devez autoriser l\'accès à la caméra pour utiliser cette fonctionnalité.';
        if (Platform.OS === 'web') {
          window.alert('Permission refusée: ' + msg);
        } else {
          Alert.alert('Permission refusée', msg);
        }
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const msg = 'La reconnaissance automatique de matricule sera disponible prochainement.\n\nVeuillez saisir le matricule manuellement pour le moment.';
        if (Platform.OS === 'web') {
          window.alert('Reconnaissance OCR\n\n' + msg);
        } else {
          Alert.alert('Reconnaissance OCR', msg, [{ text: 'OK' }]);
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      if (Platform.OS === 'web') {
        window.alert('Erreur: Impossible d\'accéder à la caméra.');
      } else {
        Alert.alert('Erreur', 'Impossible d\'accéder à la caméra.');
      }
    }
  };

  const displayTours = searchQuery.trim() ? filteredTours : tours;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🧤 Hygiène</Text>
        <Text style={styles.headerSubtitle}>Contrôles d'hygiène</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadTours} />
        }
      >
        {/* Search Card */}
        <Card style={styles.searchCard}>
          <Card.Content style={styles.searchCardContent}>
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
              
              <TouchableOpacity style={styles.cameraButton} onPress={handleCameraSearch}>
                <Text style={styles.cameraIcon}>📷</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>

        {/* Empty State */}
        {displayTours.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>Aucune tournée en attente</Text>
            <Text style={styles.emptySubtext}>d'inspection hygiène</Text>
          </View>
        )}

        {/* Tour Cards */}
        {displayTours.map((tour: any) => (
          <View key={tour.id} style={styles.tourCard}>
            <View style={styles.tourCardContent}>
              {/* Left: Driver info */}
              <View style={styles.tourLeft}>
                <Text style={styles.driverName} numberOfLines={1}>{tour.driver?.nom_complet || 'Chauffeur'}</Text>
                <MatriculeText matricule={tour.matricule_vehicule} size="small" />
              </View>
              
              {/* Right: Status */}
              <View style={styles.tourRight}>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>En attente</Text>
                </View>
              </View>
            </View>
            
            {/* Bottom row: Details */}
            <View style={styles.tourBottom}>
              <Text style={styles.detailText}>🗺️ {tour.secteur?.nom || 'N/A'}</Text>
              <Text style={styles.detailText}>📦 Retour: {tour.nbre_caisses_retour || 0} caisses</Text>
            </View>
            
            {/* Inspection Button */}
            <TouchableOpacity
              style={styles.inspectionButton}
              onPress={() => navigation.navigate('AgentHygieneDetail', { tourId: tour.id })}
              activeOpacity={0.8}
            >
              <Text style={styles.inspectionButtonText}>🔍 Inspection</Text>
            </TouchableOpacity>
          </View>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  searchCard: {
    marginBottom: 16,
    elevation: 3,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  searchCardContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  searchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
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
    marginRight: 10,
  },
  plateSearchInner: {
    backgroundColor: '#000',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 44,
  },
  leftSearchInput: {
    width: 55,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    padding: 0,
    backgroundColor: 'transparent',
    fontFamily: 'monospace',
  },
  arabicSearchSection: {
    paddingHorizontal: 8,
  },
  arabicSearchText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  rightSearchInput: {
    width: 70,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    padding: 0,
    backgroundColor: 'transparent',
    fontFamily: 'monospace',
  },
  cameraButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    fontSize: 22,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 4,
  },
  tourCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tourCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tourLeft: {
    flex: 1,
    marginRight: 12,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  tourRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tourBottom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
  inspectionButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  inspectionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
