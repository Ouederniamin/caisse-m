import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput as RNTextInput,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Title,
  Card,
  Button,
  IconButton,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import MatriculeText from '../components/MatriculeText';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type FilterType = 'all' | 'attente_sortie' | 'en_route' | 'pret_sortir' | 'completed';

interface FilterButton {
  key: FilterType;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

const FILTER_BUTTONS: FilterButton[] = [
  { key: 'all', label: 'Toutes', icon: 'view-list', color: '#607D8B', bgColor: '#ECEFF1' },
  { key: 'attente_sortie', label: 'Pesée Sortie', icon: 'arrow-up-bold-circle', color: '#2196F3', bgColor: '#E3F2FD' },
  { key: 'en_route', label: 'Pesée Entrée', icon: 'arrow-down-bold-circle', color: '#FF9800', bgColor: '#FFF3E0' },
  { key: 'pret_sortir', label: 'Prêt à Sortir', icon: 'exit-run', color: '#9C27B0', bgColor: '#F3E5F5' },
  { key: 'completed', label: 'Terminées', icon: 'check-circle', color: '#4CAF50', bgColor: '#E8F5E9' },
];

export default function SecuriteScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [serieNumber, setSerieNumber] = useState('');
  const [uniqueNumber, setUniqueNumber] = useState('');
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useFocusEffect(
    useCallback(() => {
      loadAllTours();
    }, [])
  );

  const loadAllTours = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/tours');
      // Only show tours that are relevant to security operations
      // Filter to only show today's tours (except for completed which shows all of today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const relevantTours = response.data.filter((tour: any) => {
        // Check if tour was created today
        const tourDate = new Date(tour.createdAt);
        tourDate.setHours(0, 0, 0, 0);
        const isToday = tourDate.getTime() === today.getTime();
        
        // Only include today's tours
        return isToday && ['PREPARATION', 'PRET_A_PARTIR', 'EN_TOURNEE', 'EN_ATTENTE_DECHARGEMENT', 'DE_RETOUR', 'EN_ATTENTE_HYGIENE', 'TERMINEE'].includes(tour.statut);
      });
      setTours(relevantTours);
    } catch (error) {
      console.error('Error loading tours:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllTours();
    setRefreshing(false);
  };

  const handleAuthorizeExit = async (tourId: string) => {
    try {
      await api.patch(`/api/tours/${tourId}/exit`);
      await loadAllTours();
    } catch (error) {
      console.error('Error authorizing exit:', error);
    }
  };

  const handleMatriculeSearch = (serie: string, unique: string) => {
    setSerieNumber(serie);
    setUniqueNumber(unique);
    if (serie || unique) {
      const query = `${serie} تونس ${unique}`.trim();
      setSearchQuery(query);
    } else {
      setSearchQuery('');
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSerieNumber('');
    setUniqueNumber('');
  };

  const searchTours = (toursToSearch: any[]) => {
    if (!searchQuery.trim()) return toursToSearch;
    const searchLower = searchQuery.toLowerCase();
    const searchNumbers = searchQuery.replace(/[^0-9]/g, '');
    return toursToSearch.filter((tour: any) => {
      const matricule = tour.matricule_vehicule?.toLowerCase() || '';
      const matriculeNumbers = tour.matricule_vehicule?.replace(/[^0-9]/g, '') || '';
      const driverName = tour.driver?.nom_complet?.toLowerCase() || '';
      return matricule.includes(searchLower) || driverName.includes(searchLower) || (searchNumbers && matriculeNumbers.includes(searchNumbers));
    });
  };

  // Vehicle ready to leave for delivery (needs Pesée Sortie)
  const needsPeseeSortie = (tour: any) => 
    (tour.statut === 'PRET_A_PARTIR' || tour.statut === 'PREPARATION') && !tour.poids_brut_securite_sortie;
  
  // Vehicle is out on delivery (has left, waiting to return)
  const isEnRoute = (tour: any) => 
    tour.statut === 'EN_TOURNEE' && tour.poids_brut_securite_sortie && !tour.poids_brut_securite_retour;
  
  // Vehicle has returned - needs Pesée Entrée (weighing when arriving back)
  const needsPeseeEntree = (tour: any) => 
    tour.statut === 'EN_TOURNEE' && tour.poids_brut_securite_sortie && !tour.poids_brut_securite_retour;
  
  // Vehicle weighed on return, being processed by agents
  const isBeingProcessed = (tour: any) => 
    ['EN_ATTENTE_DECHARGEMENT', 'EN_ATTENTE_HYGIENE'].includes(tour.statut);
  
  // Tour TERMINEE and ready for vehicle to exit (not yet exited)
  const isReadyToExit = (tour: any) => 
    tour.statut === 'TERMINEE' && !tour.date_sortie_finale;
  
  // Tour fully completed (vehicle has exited)
  const hasExited = (tour: any) => 
    tour.statut === 'TERMINEE' && tour.date_sortie_finale;
  
  // Tour completed (both weighings done) - for display purposes
  const isCompleted = (tour: any) => 
    tour.poids_brut_securite_sortie && tour.poids_brut_securite_retour;

  const getFilteredTours = () => {
    let result = [...tours];
    switch (activeFilter) {
      case 'all': 
        // For "all" view, exclude tours that have already exited (fully completed)
        result = result.filter(tour => !hasExited(tour)); 
        break;
      case 'attente_sortie': result = result.filter(needsPeseeSortie); break;
      case 'en_route': result = result.filter(needsPeseeEntree); break;
      case 'pret_sortir': result = result.filter(isReadyToExit); break;
      case 'completed': result = result.filter(hasExited); break;
    }
    return searchTours(result);
  };

  const getCounts = () => ({
    all: tours.filter(tour => !hasExited(tour)).length,
    attente_sortie: tours.filter(needsPeseeSortie).length,
    en_route: tours.filter(needsPeseeEntree).length,
    pret_sortir: tours.filter(isReadyToExit).length,
    completed: tours.filter(hasExited).length,
  });

  const getTourStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'PREPARATION': 'Préparation', 'PRET_A_PARTIR': 'Prêt à partir', 'EN_TOURNEE': 'En tournée',
      'EN_ATTENTE_DECHARGEMENT': 'Déchargement', 'DE_RETOUR': 'De retour', 'EN_ATTENTE_HYGIENE': 'Hygiène', 'TERMINEE': 'Terminé',
    };
    return labels[status] || status;
  };

  const getTourStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'PREPARATION': '#9E9E9E', 'PRET_A_PARTIR': '#2196F3', 'EN_TOURNEE': '#3F51B5',
      'EN_ATTENTE_DECHARGEMENT': '#9C27B0', 'DE_RETOUR': '#9C27B0', 'EN_ATTENTE_HYGIENE': '#00BCD4', 'TERMINEE': '#4CAF50',
    };
    return colors[status] || '#757575';
  };

  const displayTours = getFilteredTours();
  const counts = getCounts();

  const renderFilterButtons = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView} contentContainerStyle={styles.filterScrollContent}>
      {FILTER_BUTTONS.map((filter) => {
        const isActive = activeFilter === filter.key;
        return (
          <TouchableOpacity key={filter.key} style={[styles.filterButton, { backgroundColor: isActive ? filter.color : filter.bgColor }]} onPress={() => setActiveFilter(filter.key)} activeOpacity={0.7}>
            <MaterialCommunityIcons name={filter.icon as any} size={18} color={isActive ? '#fff' : filter.color} />
            <Text style={[styles.filterButtonText, { color: isActive ? '#fff' : filter.color }]}>{filter.label}</Text>
            <View style={[styles.filterBadge, { backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : filter.color }]}>
              <Text style={[styles.filterBadgeText, { color: '#fff' }]}>{counts[filter.key]}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderTourCard = (tour: any) => {
    const showPeseeSortie = needsPeseeSortie(tour);
    const showPeseeEntree = needsPeseeEntree(tour);
    const completed = isCompleted(tour);
    const beingProcessed = isBeingProcessed(tour);
    const readyToExit = isReadyToExit(tour);
    const exited = hasExited(tour);
    const poidsEntree = tour.poids_brut_securite_retour || tour.poids_brut_securite_entree;
    const difference = tour.poids_brut_securite_sortie && poidsEntree 
      ? (tour.poids_brut_securite_sortie - poidsEntree).toFixed(2) 
      : null;

    // Format time helper
    const formatTime = (dateStr: string | null) => {
      if (!dateStr) return '--:--';
      return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    return (
      <Card key={tour.id} style={[
        styles.tourCard, 
        showPeseeEntree && styles.tourCardEnRoute,
        readyToExit && styles.tourCardReadyToExit,
        exited && styles.tourCardDeparted,
      ]}>
        <Card.Content style={styles.cardContent}>
          {/* Header Row: Driver + Status Badge */}
          <View style={styles.tourHeader}>
            <View style={styles.tourHeaderLeft}>
              <Text style={styles.driverName}>{tour.driver?.nom_complet || 'Chauffeur'}</Text>
              <MatriculeText matricule={tour.matricule_vehicule} size="small" />
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getTourStatusColor(tour.statut) }]}>
              <Text style={styles.statusText}>{getTourStatusLabel(tour.statut)}</Text>
            </View>
          </View>

          {/* Info Row: Secteur + Caisses */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="map-marker" size={14} color="#666" />
              <Text style={styles.infoText}>{tour.secteur?.nom || 'Secteur'}</Text>
            </View>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="package-variant" size={14} color="#666" />
              <Text style={styles.infoText}>{tour.nbre_caisses_depart || 0} caisses</Text>
            </View>
          </View>

          {/* Sortie / Entrée Times Row */}
          <View style={styles.timesRow}>
            <View style={styles.timeItem}>
              <MaterialCommunityIcons name="arrow-up-circle" size={18} color={tour.date_sortie_securite ? '#2196F3' : '#BDBDBD'} />
              <Text style={styles.timeLabel}>Sortie</Text>
              <Text style={[styles.timeValue, tour.date_sortie_securite && styles.timeValueActive]}>
                {formatTime(tour.date_sortie_securite)}
              </Text>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeItem}>
              <MaterialCommunityIcons name="arrow-down-circle" size={18} color={tour.date_entree_securite ? '#FF9800' : '#BDBDBD'} />
              <Text style={styles.timeLabel}>Entrée</Text>
              <Text style={[styles.timeValue, tour.date_entree_securite && styles.timeValueActive]}>
                {formatTime(tour.date_entree_securite)}
              </Text>
            </View>
          </View>

          {/* Poids Row + Status Chip */}
          <View style={styles.poidsRow}>
            <View style={styles.poidsContainer}>
              <View style={styles.poidsItem}>
                <Text style={styles.poidsLabel}>Poids Sortie</Text>
                <Text style={[styles.poidsValue, tour.poids_brut_securite_sortie && styles.poidsValueActive]}>
                  {tour.poids_brut_securite_sortie ? `${tour.poids_brut_securite_sortie} kg` : '---'}
                </Text>
              </View>
              <MaterialCommunityIcons name="arrow-right" size={16} color="#BDBDBD" />
              <View style={styles.poidsItem}>
                <Text style={styles.poidsLabel}>Poids Entrée</Text>
                <Text style={[styles.poidsValue, poidsEntree && styles.poidsValueActive]}>
                  {poidsEntree ? `${poidsEntree} kg` : '---'}
                </Text>
              </View>
              {difference && (
                <View style={styles.diffBadge}>
                  <Text style={styles.diffText}>Δ {difference} kg</Text>
                </View>
              )}
            </View>
            
            {/* Status indicator on right */}
            {exited && (
              <View style={styles.exitedBadge}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
                <Text style={styles.exitedText}>Sortie effectuée</Text>
              </View>
            )}
            {beingProcessed && (
              <View style={styles.processingBadge}>
                <MaterialCommunityIcons name={tour.statut === 'EN_ATTENTE_DECHARGEMENT' ? 'package-down' : 'spray'} size={14} color="#795548" />
                <Text style={styles.processingText}>{tour.statut === 'EN_ATTENTE_DECHARGEMENT' ? 'Déchargement' : 'Hygiène'}</Text>
              </View>
            )}
          </View>
        </Card.Content>
        
        {/* Action Button - Only show if action needed */}
        {(showPeseeSortie || showPeseeEntree || readyToExit) && (
          <Card.Actions style={styles.cardActions}>
            {showPeseeSortie && (
              <Button 
                mode="contained" 
                icon="scale" 
                style={[styles.actionButton, { backgroundColor: '#2196F3' }]} 
                labelStyle={styles.actionButtonLabel} 
                onPress={() => navigation.navigate('PeseeSortie', { tourId: tour.id })}
              >
                Pesée Sortie
              </Button>
            )}
            
            {showPeseeEntree && (
              <Button 
                mode="contained" 
                icon="scale" 
                style={[styles.actionButton, { backgroundColor: '#FF9800' }]} 
                labelStyle={styles.actionButtonLabel} 
                onPress={() => navigation.navigate('PeseeEntree', { tourId: tour.id })}
              >
                Pesée Entrée
              </Button>
            )}
            
            {readyToExit && (
              <Button 
                mode="contained" 
                icon="exit-run" 
                style={[styles.actionButton, { backgroundColor: '#9C27B0' }]} 
                labelStyle={styles.actionButtonLabel} 
                onPress={() => handleAuthorizeExit(tour.id)}
              >
                Autoriser Sortie
              </Button>
            )}
          </Card.Actions>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}><MaterialCommunityIcons name="shield-check" size={36} color="#fff" /></View>
          <View style={styles.headerTextContainer}><Title style={styles.headerTitle}>Sécurité</Title><Text style={styles.headerSubtitle}>Pesées sortie & entrée</Text></View>
        </View>
      </View>
      <View style={styles.content}>
        <Card style={styles.searchCard}>
          <Card.Content style={styles.searchCardContent}>
            <Text style={styles.searchLabel}> Recherche par matricule</Text>
            <View style={styles.searchContainer}>
              <View style={styles.plateSearchContainer}>
                <View style={styles.plateSearchInner}>
                  <RNTextInput value={serieNumber} onChangeText={(text) => { const cleaned = text.replace(/[^0-9]/g, '').slice(0, 3); handleMatriculeSearch(cleaned, uniqueNumber); }} keyboardType="numeric" maxLength={3} style={styles.leftSearchInput} placeholder="123" placeholderTextColor="#666" />
                  <View style={styles.arabicSearchSection}><Text style={styles.arabicSearchText}>تونس</Text></View>
                  <RNTextInput value={uniqueNumber} onChangeText={(text) => { const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4); handleMatriculeSearch(serieNumber, cleaned); }} keyboardType="numeric" maxLength={4} style={styles.rightSearchInput} placeholder="4567" placeholderTextColor="#666" />
                </View>
              </View>
              {searchQuery && <IconButton icon="close-circle" size={28} iconColor="#F44336" style={styles.clearButton} onPress={clearSearch} />}
            </View>
          </Card.Content>
        </Card>
        {renderFilterButtons()}
        {loading && <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#3F51B5" /><Text style={styles.loadingText}>Chargement...</Text></View>}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {!loading && displayTours.length === 0 && (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons name="truck-outline" size={48} color="#BDBDBD" />
                <Text style={styles.emptyText}>
                  {searchQuery.trim() 
                    ? 'Aucune tournée trouvée pour ce matricule' 
                    : activeFilter === 'attente_sortie' 
                    ? 'Aucun véhicule en attente de pesée sortie' 
                    : activeFilter === 'en_route' 
                    ? 'Aucun véhicule de retour à peser' 
                    : activeFilter === 'completed' 
                    ? 'Aucune tournée terminée' 
                    : 'Aucune tournée disponible'}
                </Text>
                {searchQuery.trim() && <Button mode="text" onPress={clearSearch} style={styles.clearSearchButton}>Effacer la recherche</Button>}
              </Card.Content>
            </Card>
          )}
          {displayTours.map(renderTourCard)}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#3F51B5', paddingTop: Platform.OS === 'ios' ? 50 : 40, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
  headerContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  headerTextContainer: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 2 },
  headerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 15, paddingVertical: 12, paddingHorizontal: 10 },
  statItem: { flex: 1, alignItems: 'center' },
  statIcon: { marginBottom: 4 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: 5 },
  statValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  content: { flex: 1, padding: 15 },
  searchCard: { marginBottom: 12, elevation: 2, borderRadius: 12 },
  searchCardContent: { paddingVertical: 12 },
  searchLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center' },
  plateSearchContainer: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 3, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
  plateSearchInner: { backgroundColor: '#000', borderRadius: 6, borderWidth: 2.5, borderColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingVertical: 6, minHeight: 48 },
  leftSearchInput: { width: 60, fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center', padding: 0, backgroundColor: 'transparent' },
  arabicSearchSection: { paddingHorizontal: 8, paddingVertical: 2 },
  arabicSearchText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  rightSearchInput: { width: 75, fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center', padding: 0, backgroundColor: 'transparent' },
  clearButton: { marginLeft: 8, backgroundColor: '#FFEBEE' },
  filterScrollView: { marginBottom: 12, maxHeight: 50 },
  filterScrollContent: { paddingRight: 10, gap: 8, flexDirection: 'row' },
  filterButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  filterButtonText: { fontSize: 13, fontWeight: '600' },
  filterBadge: { minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  filterBadgeText: { fontSize: 11, fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  loadingText: { marginTop: 10, color: '#666' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  emptyCard: { marginTop: 20, backgroundColor: '#E3F2FD', borderRadius: 12 },
  emptyContent: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { textAlign: 'center', color: '#1976D2', fontSize: 16, fontWeight: '500', marginTop: 15 },
  clearSearchButton: { marginTop: 10 },
  
  // Tour Card Styles
  tourCard: { marginBottom: 12, elevation: 3, borderRadius: 12, backgroundColor: '#fff' },
  tourCardEnRoute: { borderLeftWidth: 4, borderLeftColor: '#FF9800' },
  tourCardReadyToExit: { borderLeftWidth: 4, borderLeftColor: '#9C27B0' },
  tourCardDeparted: { borderLeftWidth: 4, borderLeftColor: '#4CAF50', opacity: 0.85 },
  cardContent: { paddingVertical: 12, paddingHorizontal: 14 },
  
  // Header Row
  tourHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tourHeaderLeft: { flex: 1, gap: 4 },
  driverName: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  
  // Info Row
  infoRow: { flexDirection: 'row', gap: 16, marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 13, color: '#666' },
  
  // Times Row
  timesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10 },
  timeItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  timeLabel: { fontSize: 12, color: '#666', fontWeight: '500' },
  timeValue: { fontSize: 14, fontWeight: 'bold', color: '#BDBDBD' },
  timeValueActive: { color: '#1a1a1a' },
  timeDivider: { width: 1, height: 24, backgroundColor: '#E0E0E0', marginHorizontal: 10 },
  
  // Poids Row
  poidsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F5F5F5', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 },
  poidsContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  poidsItem: { alignItems: 'center' },
  poidsLabel: { fontSize: 10, color: '#888', marginBottom: 2 },
  poidsValue: { fontSize: 13, fontWeight: 'bold', color: '#BDBDBD' },
  poidsValueActive: { color: '#2E7D32' },
  diffBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  diffText: { fontSize: 11, fontWeight: 'bold', color: '#E65100' },
  
  // Status Badges
  exitedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  exitedText: { fontSize: 11, fontWeight: '600', color: '#2E7D32' },
  processingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFEBE9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  processingText: { fontSize: 11, fontWeight: '600', color: '#5D4037' },
  
  // Card Actions
  cardActions: { justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 12, paddingTop: 0 },
  actionButton: { borderRadius: 8, flex: 1 },
  actionButtonLabel: { fontSize: 13, fontWeight: '600' },
  
  // Legacy styles kept for compatibility
  completeChip: { backgroundColor: '#E8F5E9' },
  completeChipText: { color: '#2E7D32', fontWeight: '600' },
  processingChip: { backgroundColor: '#EFEBE9' },
  processingChipText: { color: '#5D4037', fontWeight: '600' },
});
