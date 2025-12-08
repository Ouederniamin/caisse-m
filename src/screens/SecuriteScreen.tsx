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
      // Exclude tours that have already exited (date_sortie_finale set) from the main view
      const relevantTours = response.data.filter((tour: any) => 
        ['PREPARATION', 'PRET_A_PARTIR', 'EN_TOURNEE', 'EN_ATTENTE_DECHARGEMENT', 'DE_RETOUR', 'EN_ATTENTE_HYGIENE', 'TERMINEE'].includes(tour.statut)
      );
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

    return (
      <Card key={tour.id} style={[
        styles.tourCard, 
        showPeseeEntree && styles.tourCardEnRoute,
        readyToExit && styles.tourCardReadyToExit,
        exited && styles.tourCardDeparted,
      ]}>
        <Card.Content>
          {/* Vehicle returned - needs Pesée Entrée */}
          {showPeseeEntree && (
            <View style={styles.enRouteBanner}>
              <MaterialCommunityIcons name="keyboard-return" size={18} color="#FF9800" />
              <Text style={styles.enRouteBannerText}>Véhicule de retour - Pesée requise</Text>
              {tour.date_sortie_securite && (
                <Text style={styles.enRouteBannerTime}>
                  Sorti à {new Date(tour.date_sortie_securite).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
          )}
          
          {/* Being Processed Banner (Déchargement or Hygiène) */}
          {beingProcessed && (
            <View style={styles.processingBanner}>
              <MaterialCommunityIcons 
                name={tour.statut === 'EN_ATTENTE_DECHARGEMENT' ? 'package-down' : 'spray'} 
                size={18} 
                color="#795548" 
              />
              <Text style={styles.processingBannerText}>
                {tour.statut === 'EN_ATTENTE_DECHARGEMENT' ? 'Déchargement en cours' : 'Nettoyage en cours'}
              </Text>
            </View>
          )}
          
          {/* Ready to Exit Banner */}
          {readyToExit && (
            <View style={styles.readyToExitBanner}>
              <MaterialCommunityIcons name="exit-run" size={18} color="#9C27B0" />
              <Text style={styles.readyToExitBannerText}>Prêt à sortir - Autoriser sortie</Text>
            </View>
          )}
          
          {/* Exited Banner */}
          {exited && (
            <View style={styles.departedBanner}>
              <MaterialCommunityIcons name="check-circle" size={18} color="#4CAF50" />
              <Text style={styles.departedBannerText}>Véhicule sorti</Text>
              {tour.date_sortie_finale && (
                <Text style={styles.departedBannerTime}>
                  Sortie: {new Date(tour.date_sortie_finale).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
          )}
          
          <View style={styles.tourHeader}>
            <View style={styles.tourHeaderLeft}>
              <Text style={styles.driverName}>{tour.driver?.nom_complet || 'Chauffeur non assigné'}</Text>
              <MatriculeText matricule={tour.matricule_vehicule} size="medium" />
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getTourStatusColor(tour.statut) }]}>
              <Text style={styles.statusText}>{getTourStatusLabel(tour.statut)}</Text>
            </View>
          </View>
          
          <View style={styles.tourInfoCompact}>
            <Text style={styles.infoTextCompact}>
              📍 {tour.secteur?.nom || 'Secteur'} • 📦 {tour.nbre_caisses_depart || tour.nombre_caisses_livrees || 0} caisses
              {tour.date_sortie_securite && ` • ⏱ ${new Date(tour.date_sortie_securite).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
            </Text>
          </View>

          <View style={styles.peseeSection}>
            <View style={styles.peseeRowCompact}>
              <View style={[styles.peseeItemCompact, tour.poids_brut_securite_sortie && styles.peseeItemCompactDone]}>
                <MaterialCommunityIcons name="arrow-up-bold-circle" size={18} color={tour.poids_brut_securite_sortie ? '#4CAF50' : '#9E9E9E'} />
                <Text style={styles.peseeLabelCompact}>Sortie</Text>
                <Text style={[styles.peseeValueCompact, tour.poids_brut_securite_sortie && styles.peseeValueCompactDone]}>
                  {tour.poids_brut_securite_sortie ? `${tour.poids_brut_securite_sortie} kg` : '---'}
                </Text>
              </View>
              
              <MaterialCommunityIcons 
                name={completed ? 'check-circle' : showPeseeEntree ? 'chevron-right' : 'arrow-right'} 
                size={20} 
                color={completed ? '#4CAF50' : showPeseeEntree ? '#FF9800' : '#BDBDBD'} 
              />
              
              <View style={[styles.peseeItemCompact, poidsEntree && styles.peseeItemCompactDone]}>
                <MaterialCommunityIcons name="arrow-down-bold-circle" size={18} color={poidsEntree ? '#4CAF50' : '#9E9E9E'} />
                <Text style={styles.peseeLabelCompact}>Entrée</Text>
                <Text style={[styles.peseeValueCompact, poidsEntree && styles.peseeValueCompactDone]}>
                  {poidsEntree ? `${poidsEntree} kg` : '---'}
                </Text>
              </View>
              
              {difference && (
                <View style={styles.differenceCompact}>
                  <Text style={styles.differenceValueCompact}>{difference > 0 ? '+' : ''}{difference} kg</Text>
                </View>
              )}
            </View>
          </View>
        </Card.Content>
        
        <Card.Actions style={styles.cardActions}>
          {/* Pesée Sortie - Vehicle leaving for delivery */}
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
          
          {/* Pesée Entrée - Vehicle returned from delivery */}
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
          
          {/* Being processed by agents - Show status */}
          {beingProcessed && (
            <Chip 
              icon={tour.statut === 'EN_ATTENTE_DECHARGEMENT' ? 'package-down' : 'spray'} 
              style={styles.processingChip} 
              textStyle={styles.processingChipText}
            >
              {tour.statut === 'EN_ATTENTE_DECHARGEMENT' ? 'Déchargement' : 'Hygiène'}
            </Chip>
          )}
          
          {/* Ready to Exit - Authorize vehicle exit */}
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
          
          {/* Exited - Show completion */}
          {exited && (
            <Chip 
              icon="check-circle" 
              style={styles.completeChip} 
              textStyle={styles.completeChipText}
            >
              Sortie effectuée
            </Chip>
          )}
        </Card.Actions>
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
  tourCard: { marginBottom: 12, elevation: 2, borderRadius: 12 },
  tourCardEnRoute: { borderLeftWidth: 4, borderLeftColor: '#FF9800', backgroundColor: '#FFFDE7' },
  tourCardRetour: { borderLeftWidth: 4, borderLeftColor: '#9C27B0', backgroundColor: '#FBF5FF' },
  enRouteBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF3E0', 
    marginBottom: 12, 
    marginHorizontal: -16, 
    marginTop: -16, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderTopLeftRadius: 12, 
    borderTopRightRadius: 12,
    gap: 8,
  },
  enRouteBannerText: { 
    color: '#E65100', 
    fontWeight: '600', 
    fontSize: 14, 
    flex: 1,
  },
  enRouteBannerTime: { 
    color: '#FF9800', 
    fontSize: 12, 
    fontWeight: '500',
  },
  retourBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F3E5F5', 
    marginBottom: 12, 
    marginHorizontal: -16, 
    marginTop: -16, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderTopLeftRadius: 12, 
    borderTopRightRadius: 12,
    gap: 8,
  },
  retourBannerText: { 
    color: '#7B1FA2', 
    fontWeight: '600', 
    fontSize: 14,
  },
  tourHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  tourHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  driverName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  tourInfoCompact: { marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoTextCompact: { fontSize: 13, color: '#666' },
  peseeSection: { backgroundColor: '#FAFAFA', borderRadius: 8, padding: 10, marginTop: 4 },
  peseeRowCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  peseeItemCompact: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6 },
  peseeItemCompactDone: { backgroundColor: '#E8F5E9' },
  peseeLabelCompact: { fontSize: 13, color: '#666' },
  peseeValueCompact: { fontSize: 15, fontWeight: 'bold', color: '#9E9E9E' },
  peseeValueCompactDone: { color: '#2E7D32' },
  differenceCompact: { backgroundColor: '#FFF3E0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  differenceValueCompact: { fontSize: 14, fontWeight: 'bold', color: '#FF9800' },
  enRouteBadge: { 
    backgroundColor: '#FFF3E0', 
    borderRadius: 20, 
    padding: 8,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  enRouteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  enRouteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  enRouteInfoText: {
    color: '#E65100',
    fontWeight: '600',
    fontSize: 13,
  },
  differenceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEEEEE', gap: 8 },
  differenceText: { fontSize: 14, color: '#666' },
  differenceValue: { fontWeight: 'bold', color: '#FF9800' },
  cardActions: { justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  actionButton: { borderRadius: 8 },
  actionButtonLabel: { fontSize: 13, fontWeight: '600' },
  completeChip: { backgroundColor: '#E8F5E9' },
  completeChipText: { color: '#2E7D32', fontWeight: '600' },
  enRouteChip: { backgroundColor: '#FFF3E0' },
  enRouteChipText: { color: '#E65100', fontWeight: '600' },
  processingChip: { backgroundColor: '#EFEBE9' },
  processingChipText: { color: '#5D4037', fontWeight: '600' },
  processingBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#EFEBE9', 
    marginBottom: 12, 
    marginHorizontal: -16, 
    marginTop: -16, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderTopLeftRadius: 12, 
    borderTopRightRadius: 12,
    gap: 8,
  },
  processingBannerText: { 
    color: '#5D4037', 
    fontWeight: '600', 
    fontSize: 14,
  },
  readyDepartBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F3E5F5', 
    marginBottom: 12, 
    marginHorizontal: -16, 
    marginTop: -16, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderTopLeftRadius: 12, 
    borderTopRightRadius: 12,
    gap: 8,
  },
  readyDepartBannerText: { 
    color: '#7B1FA2', 
    fontWeight: '600', 
    fontSize: 14,
    flex: 1,
  },
  readyToExitBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F3E5F5', 
    marginBottom: 12, 
    marginHorizontal: -16, 
    marginTop: -16, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderTopLeftRadius: 12, 
    borderTopRightRadius: 12,
    gap: 8,
  },
  readyToExitBannerText: { 
    color: '#7B1FA2', 
    fontWeight: '600', 
    fontSize: 14,
    flex: 1,
  },
  departedBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#E8F5E9', 
    marginBottom: 12, 
    marginHorizontal: -16, 
    marginTop: -16, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderTopLeftRadius: 12, 
    borderTopRightRadius: 12,
    gap: 8,
  },
  departedBannerText: { 
    color: '#2E7D32', 
    fontWeight: '600', 
    fontSize: 14,
    flex: 1,
  },
  departedBannerTime: { 
    color: '#4CAF50', 
    fontSize: 12, 
    fontWeight: '500',
  },
  tourCardReadyDepart: { borderLeftWidth: 4, borderLeftColor: '#9C27B0', backgroundColor: '#FBF5FF' },
  tourCardReadyToExit: { borderLeftWidth: 4, borderLeftColor: '#9C27B0', backgroundColor: '#FBF5FF' },
  tourCardDeparted: { borderLeftWidth: 4, borderLeftColor: '#4CAF50', backgroundColor: '#F1F8E9' },
  waitingChip: { backgroundColor: '#ECEFF1' },
  waitingChipText: { color: '#607D8B', fontWeight: '600' },
});
