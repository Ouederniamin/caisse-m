import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, View, ScrollView, Alert, TextInput as RNTextInput, RefreshControl, Platform, Pressable } from 'react-native';
import { Text, Card, Title, Button, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import MatriculeText from '../components/MatriculeText';

export default function AgentControleScreen() {
  const navigation = useNavigation<any>();
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to navigate to root stack screens
  const navigateToScreen = (screenName: string, params?: any) => {
    // Use getParent to access root stack navigator
    const rootNav = navigation.getParent() || navigation;
    rootNav.navigate(screenName, params);
  };
  const filterScrollRef = useRef<ScrollView>(null);
  const [serieNumber, setSerieNumber] = useState('');
  const [uniqueNumber, setUniqueNumber] = useState('');

  // Status filter options - Updated for new flow
  const statusFilters = [
    { key: 'all', label: 'Toutes', icon: '📋', color: '#1D4ED8' },
    { key: 'PESEE_VIDE', label: 'Chargement', icon: '📦', color: '#6B7280' },
    { key: 'PRET_A_PARTIR', label: 'Prêt', icon: '🚀', color: '#2563EB' },
    { key: 'EN_TOURNEE', label: 'En tournée', icon: '🚚', color: '#F59E0B' },
    { key: 'RETOUR', label: 'Retour', icon: '🔙', color: '#8B5CF6' },
    { key: 'EN_ATTENTE_DECHARGEMENT', label: 'Déchargé', icon: '✅', color: '#10B981' },
    { key: 'EN_ATTENTE_HYGIENE', label: 'Hygiène', icon: '🧹', color: '#EF4444' },
    { key: 'TERMINEE', label: 'Terminée', icon: '✅', color: '#10B981' },
  ];

  // Compute counts for each status
  const getStatusCount = (status: string) => {
    if (status === 'all') return tours.length;
    return tours.filter(tour => tour.statut === status).length;
  };

  // Refresh when screen comes into focus (e.g., after creating a tour)
  useFocusEffect(
    useCallback(() => {
      loadTours();
    }, [])
  );

  const loadTours = async () => {
    setLoading(true);
    try {
      // Always load all tours, filter locally for better UX
      const response = await api.get('/api/tours');
      const data = response.data || [];
      setTours(data);
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de charger les tournées');
      console.error('Load tours error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTourStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'PESEE_VIDE': 'Attente chargement',
      'EN_CHARGEMENT': 'En chargement',
      'PRET_A_PARTIR': 'Prêt à partir',
      'EN_TOURNEE': 'En tournée',
      'RETOUR': 'Retour usine',
      'EN_ATTENTE_DECHARGEMENT': 'Déchargé',
      'EN_ATTENTE_HYGIENE': 'Attente hygiène',
      'TERMINEE': 'Terminé',
    };
    return labels[status] || status;
  };

  const getTourStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'PESEE_VIDE': '#9E9E9E',
      'EN_CHARGEMENT': '#FF9800',
      'PRET_A_PARTIR': '#2196F3',
      'EN_TOURNEE': '#FF9800',
      'RETOUR': '#9C27B0',
      'EN_ATTENTE_DECHARGEMENT': '#4CAF50',
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
  };

  // Get tours to display - apply both status filter and search
  const getDisplayTours = () => {
    let result = tours;
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(tour => tour.statut === statusFilter);
    }
    
    // Apply search filter
    if (searchQuery.length >= 3) {
      const searchTerm = searchQuery.toLowerCase().replace(/\s+/g, '');
      result = result.filter(tour => {
        const matriculeClean = tour.matricule_vehicule?.toLowerCase().replace(/\s+/g, '');
        return matriculeClean?.includes(searchTerm) ||
               tour.driver?.nom_complet?.toLowerCase().includes(searchTerm);
      });
    }
    
    return result;
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSerieNumber('');
    setUniqueNumber('');
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

  const displayTours = getDisplayTours();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>📋 Contrôle</Title>
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
      </View>

      {/* Status Filter Buttons */}
      <View style={styles.filterSection}>
        <ScrollView 
          ref={filterScrollRef}
          horizontal 
          showsHorizontalScrollIndicator={Platform.OS === 'web'}
          contentContainerStyle={styles.filterScrollContent}
          decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.985}
          scrollEventThrottle={16}
          bounces={Platform.OS !== 'web'}
          overScrollMode="always"
          style={Platform.OS === 'web' ? styles.filterScrollWeb : undefined}
        >
          {statusFilters.map((sf, index) => {
            const count = getStatusCount(sf.key);
            const isActive = statusFilter === sf.key;
            
            return (
              <Pressable
                key={sf.key}
                style={({ pressed }) => [
                  styles.filterButton,
                  isActive && { backgroundColor: sf.color, borderColor: sf.color },
                  index === 0 && { marginLeft: 0 },
                  Platform.OS === 'web' && styles.filterButtonWeb,
                  pressed && styles.filterButtonPressed,
                ]}
                onPress={() => setStatusFilter(sf.key)}
              >
                <View style={styles.filterContent}>
                  <Text style={styles.filterIcon}>{sf.icon}</Text>
                  <Text style={[
                    styles.filterLabel,
                    isActive && styles.filterLabelActive
                  ]}>
                    {sf.label}
                  </Text>
                </View>
                <View style={[
                  styles.filterBadge,
                  isActive && styles.filterBadgeActive,
                  count === 0 && !isActive && styles.filterBadgeEmpty
                ]}>
                  <Text style={[
                    styles.filterBadgeText,
                    isActive && styles.filterBadgeTextActive,
                    count === 0 && !isActive && styles.filterBadgeTextEmpty
                  ]}>
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          {/* Extra padding at end for better scroll */}
          <View style={{ width: 24 }} />
        </ScrollView>
        
        {/* Scroll hint indicator - hide on web */}
        {Platform.OS !== 'web' && (
          <View style={styles.scrollHint}>
            <Text style={styles.scrollHintText}>← glisser →</Text>
          </View>
        )}
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.tourListContent}
        refreshControl={
          <RefreshControl onRefresh={loadTours} refreshing={loading} />
        }
      >
        {displayTours.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-alert-outline" size={42} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Aucune tournée trouvée</Text>
            <Text style={styles.emptySubtitle}>
              {statusFilter !== 'all' 
                ? `Aucune tournée avec le statut "${statusFilters.find(s => s.key === statusFilter)?.label}"`
                : 'Essayez une autre recherche ou ajoutez une nouvelle tournée.'}
            </Text>
          </View>
        )}

        {displayTours.map((tour: any) => (
          <Card key={tour.id} style={styles.tourCard}>
            <Card.Content style={styles.tourCardContent}>
              <View style={styles.tourHeader}>
                <View style={styles.tourHeaderLeft}>
                  <Text style={styles.tourTitle}>{tour.driver?.nom_complet || 'Non assigné'}</Text>
                  <MatriculeText matricule={tour.matricule_vehicule} size="small" />
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

              <View style={styles.tourDetailsRow}>
                <Text style={styles.detailText}>📍 {tour.secteur?.nom || 'À définir'}</Text>
                {tour.nbre_caisses_depart > 0 && (
                  <Text style={styles.detailText}>📦 {tour.nbre_caisses_depart} caisses</Text>
                )}
                {tour.poids_a_vide > 0 && (
                  <Text style={styles.detailText}>⚖️ Vide: {tour.poids_a_vide} kg</Text>
                )}
                {tour.driver?.marque_vehicule && (
                  <Text style={styles.detailText}>🚛 {tour.driver.marque_vehicule}</Text>
                )}
                {tour.nbre_caisses_retour !== null && (
                  <Text style={styles.detailText}>↩️ {tour.nbre_caisses_retour} retour</Text>
                )}
                {tour.conflicts && tour.conflicts.length > 0 && (
                  <Text style={styles.conflictText}>⚠️ {tour.conflicts.length} conflit(s)</Text>
                )}
              </View>
            </Card.Content>

            <Card.Actions style={styles.actions}>
              {/* PESEE_VIDE - Ready for loading (chargement) */}
              {tour.statut === 'PESEE_VIDE' && (
                <Button
                  mode="contained"
                  icon="package-up"
                  style={[styles.actionButton, { backgroundColor: '#1D4ED8' }]}
                  onPress={() => navigateToScreen('ChargementDetail', { tourId: tour.id })}
                >
                  Chargement
                </Button>
              )}

              {/* PRET_A_PARTIR - Waiting for security checkpoint */}
              {tour.statut === 'PRET_A_PARTIR' && (
                <View style={styles.waitingBadge}>
                  <Text style={styles.waitingText}>⏳ En attente pesée sortie</Text>
                </View>
              )}

              {/* EN_TOURNEE - Tour in progress */}
              {tour.statut === 'EN_TOURNEE' && (
                <View style={styles.inProgressBadge}>
                  <Text style={styles.inProgressText}>🚚 En cours de livraison</Text>
                </View>
              )}
              
              {/* RETOUR - Handle return/unloading */}
              {tour.statut === 'RETOUR' && (
                <Button
                  mode="contained"
                  icon="package-down"
                  style={[styles.actionButton, { backgroundColor: '#9C27B0' }]}
                  onPress={() => navigateToScreen('AgentControleRetour', { tourId: tour.id })}
                >
                  Déchargement
                </Button>
              )}

              {/* EN_ATTENTE_DECHARGEMENT - Unloaded, waiting for hygiene or done */}
              {tour.statut === 'EN_ATTENTE_DECHARGEMENT' && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedText}>✅ Déchargé</Text>
                </View>
              )}

              {/* EN_ATTENTE_HYGIENE - Waiting for hygiene check */}
              {tour.statut === 'EN_ATTENTE_HYGIENE' && (
                <View style={styles.hygieneBadge}>
                  <Text style={styles.hygieneText}>🧹 En attente vérif. hygiène</Text>
                </View>
              )}

              {/* TERMINEE - Completed */}
              {tour.statut === 'TERMINEE' && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedText}>✅ Terminée</Text>
                </View>
              )}
              
              {/* View details for any status */}
              <Button
                mode="outlined"
                icon="eye"
                style={styles.actionButtonOutlined}
                onPress={() => navigateToScreen('TourDetail', { tourId: tour.id })}
              >
                Détails
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
    backgroundColor: '#F4F6FB',
  },
  header: {
    backgroundColor: '#1D4ED8',
    paddingTop: 45,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  searchCard: {
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plateSearchContainer: {
    flex: 1,
    marginRight: 10,
    borderRadius: 10,
    padding: 3,
    backgroundColor: '#F3F4F6',
  },
  plateSearchInner: {
    backgroundColor: '#111827',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  leftSearchInput: {
    width: 50,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    padding: 0,
    backgroundColor: 'transparent',
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
    width: 65,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    padding: 0,
    backgroundColor: 'transparent',
  },
  searchActions: {
    flexDirection: 'row',
    gap: 6,
  },
  cameraButton: {
    margin: 0,
    backgroundColor: '#DBEAFE',
  },
  clearButton: {
    margin: 0,
    backgroundColor: '#FEE2E2',
  },
  filterSection: {
    paddingTop: 4,
    paddingBottom: 2,
  },
  filterScrollContent: {
    paddingLeft: 16,
    paddingRight: 0,
    gap: 8,
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      paddingBottom: 6,
    }),
  },
  filterScrollWeb: {
    // Web-specific scrollbar styling
    scrollbarWidth: 'thin',
    scrollbarColor: '#CBD5E1 transparent',
  } as any,
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 36,
  },
  filterButtonWeb: {
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    userSelect: 'none',
  } as any,
  filterButtonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  filterContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginRight: 6,
  },
  filterLabelActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterBadgeEmpty: {
    backgroundColor: '#F9FAFB',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  filterBadgeTextActive: {
    color: '#FFFFFF',
  },
  filterBadgeTextEmpty: {
    color: '#9CA3AF',
  },
  scrollHint: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 2,
  },
  scrollHintText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  tourListContent: {
    paddingBottom: 140,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  tourCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tourCardContent: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tourHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  tourTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginRight: 8,
  },
  tourHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    minWidth: 200,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tourDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailText: {
    fontSize: 12,
    color: '#374151',
  },
  conflictText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  actions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  actionButton: {
    borderRadius: 12,
  },
  actionButtonOutlined: {
    borderRadius: 12,
    borderColor: '#1D4ED8',
  },
  waitingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    flex: 1,
  },
  waitingText: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  inProgressBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    flex: 1,
  },
  inProgressText: {
    color: '#1E40AF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  hygieneBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    flex: 1,
  },
  hygieneText: {
    color: '#991B1B',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  completedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    flex: 1,
  },
  completedText: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
