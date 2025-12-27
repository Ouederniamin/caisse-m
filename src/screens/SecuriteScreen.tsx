import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput as RNTextInput,
  Platform,
  TouchableOpacity,
  Alert,
  I18nManager,
} from 'react-native';
import {
  Text,
  Title,
  Card,
  Button,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import MatriculeText from '../components/MatriculeText';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Arabic translations
const AR = {
  security: 'الأمن',
  securitySubtitle: 'إدارة الوزن والوصول',
  searchByPlate: '🔍 البحث بالترقيم',
  all: 'الكل',
  exitWeighing: 'وزن الخروج',
  markArrival: 'تسجيل الوصول',
  finalExit: 'خروج نهائي',
  loading: 'جاري التحميل...',
  noToursToday: 'لا توجد جولات اليوم',
  noVehicleForPlate: 'لا توجد مركبة بهذا الترقيم',
  noVehicleWaiting: 'لا توجد مركبات في انتظار وزن الخروج',
  noVehicleOnRoute: 'لا توجد مركبات في الجولة',
  noVehicleReady: 'لا توجد مركبات جاهزة للخروج',
  clearSearch: 'مسح البحث',
  driver: 'السائق',
  emptyWeight: 'الوزن فارغ',
  exit: 'خروج',
  return: 'عودة',
  loadedWeight: 'الوزن المحمل',
  netWeight: 'الوزن الصافي',
  waitingForLoading: 'في انتظار التحميل',
  waitingForUnloading: 'في انتظار التفريغ',
  hygieneCheck: 'فحص النظافة',
  unloadingInProgress: 'جاري التفريغ',
  exitWeighingBtn: 'وزن الخروج',
  markArrivalBtn: 'تسجيل الوصول',
  authorizeExitBtn: 'تصريح الخروج',
  confirmArrival: 'تأكيد الوصول',
  markVehicleArrived: 'هل تريد تسجيل وصول هذه المركبة؟',
  cancel: 'إلغاء',
  confirm: 'تأكيد',
  error: 'خطأ',
  cannotMarkArrival: 'تعذر تسجيل الوصول',
  crates: 'صندوق',
  kgEmpty: 'كغ فارغ',
  kg: 'كغ',
  // Status labels
  statusEmptyWeight: 'وزن فارغ',
  statusLoading: 'التحميل',
  statusReadyToLeave: 'جاهز للانطلاق',
  statusOnRoute: 'في الجولة',
  statusReturn: 'العودة',
  statusUnloading: 'التفريغ',
  statusHygiene: 'النظافة',
  statusComplete: 'مكتمل',
};

// Cross-platform alert helper for web support
const showAlert = (title: string, message: string, buttons?: Array<{ text: string; style?: string; onPress?: () => void }>) => {
  if (Platform.OS === 'web') {
    // On web, use window.confirm for simple confirmation dialogs
    if (buttons && buttons.length === 2) {
      const confirmBtn = buttons.find(b => b.style !== 'cancel');
      const result = window.confirm(`${title}\n\n${message}`);
      if (result && confirmBtn?.onPress) {
        confirmBtn.onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    Alert.alert(title, message, buttons as any);
  }
};

type FilterType = 'all' | 'pesee_sortie' | 'en_route' | 'pret_sortir';

interface FilterButton {
  key: FilterType;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

const FILTER_BUTTONS: FilterButton[] = [
  { key: 'all', label: AR.all, icon: 'view-list', color: '#607D8B', bgColor: '#ECEFF1' },
  { key: 'pesee_sortie', label: AR.exitWeighing, icon: 'arrow-up-bold-circle', color: '#2196F3', bgColor: '#E3F2FD' },
  { key: 'en_route', label: AR.markArrival, icon: 'arrow-down-bold-circle', color: '#FF9800', bgColor: '#FFF3E0' },
  { key: 'pret_sortir', label: AR.finalExit, icon: 'exit-run', color: '#4CAF50', bgColor: '#E8F5E9' },
];

export default function SecuriteScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const filterScrollRef = useRef<ScrollView>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [serieNumber, setSerieNumber] = useState('');
  const [uniqueNumber, setUniqueNumber] = useState('');
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Scroll filter to end (right side) for RTL layout
  useEffect(() => {
    setTimeout(() => {
      filterScrollRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAllTours();
    }, [])
  );

  const loadAllTours = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/tours');
      
      // Show tours that are either:
      // 1. Created today, OR
      // 2. Still in progress (not yet completed with final exit)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const relevantTours = response.data.filter((tour: any) => {
        const tourDate = new Date(tour.createdAt);
        tourDate.setHours(0, 0, 0, 0);
        const isToday = tourDate.getTime() === today.getTime();
        
        // Show if created today OR if still in progress (no final exit)
        const isInProgress = !tour.date_sortie_finale && tour.statut !== 'TERMINEE';
        const isCompletedButNotExited = tour.statut === 'TERMINEE' && !tour.date_sortie_finale;
        
        return isToday || isInProgress || isCompletedButNotExited;
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

  const handleAuthorizeExit = (tourId: string) => {
    // Navigate to the confirmation screen
    navigation.navigate('AuthorizeExit', { tourId });
  };

  const handleMarkArrival = (tourId: string) => {
    // Navigate to the confirmation screen instead of showing an alert
    navigation.navigate('ConfirmArrival', { tourId });
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

  const needsPeseeSortie = (tour: any) => tour.statut === 'PRET_A_PARTIR' && !tour.poids_brut_securite_sortie;
  const isEnRoute = (tour: any) => tour.statut === 'EN_TOURNEE';
  const isReadyToExit = (tour: any) => tour.statut === 'TERMINEE' && !tour.date_sortie_finale;
  const hasExited = (tour: any) => tour.statut === 'TERMINEE' && tour.date_sortie_finale;
  const isWaitingForChargement = (tour: any) => tour.statut === 'PESEE_VIDE';
  const isWaitingForDechargement = (tour: any) => tour.statut === 'RETOUR';
  const isBeingProcessed = (tour: any) => ['EN_ATTENTE_DECHARGEMENT', 'EN_ATTENTE_HYGIENE'].includes(tour.statut);

  const getFilteredTours = () => {
    let result = [...tours];
    switch (activeFilter) {
      case 'all': result = result.filter(tour => !hasExited(tour)); break;
      case 'pesee_sortie': result = result.filter(needsPeseeSortie); break;
      case 'en_route': result = result.filter(isEnRoute); break;
      case 'pret_sortir': result = result.filter(isReadyToExit); break;
    }
    return searchTours(result);
  };

  const getCounts = () => ({
    all: tours.filter(tour => !hasExited(tour)).length,
    pesee_sortie: tours.filter(needsPeseeSortie).length,
    en_route: tours.filter(isEnRoute).length,
    pret_sortir: tours.filter(isReadyToExit).length,
  });

  const getTourStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'PESEE_VIDE': AR.statusEmptyWeight,
      'EN_CHARGEMENT': AR.statusLoading,
      'PRET_A_PARTIR': AR.statusReadyToLeave,
      'EN_TOURNEE': AR.statusOnRoute,
      'RETOUR': AR.statusReturn,
      'EN_ATTENTE_DECHARGEMENT': AR.statusUnloading,
      'EN_ATTENTE_HYGIENE': AR.statusHygiene,
      'TERMINEE': AR.statusComplete,
    };
    return labels[status] || status;
  };

  const getTourStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'PESEE_VIDE': '#9C27B0',
      'EN_CHARGEMENT': '#673AB7',
      'PRET_A_PARTIR': '#2196F3',
      'EN_TOURNEE': '#3F51B5',
      'RETOUR': '#FF9800',
      'EN_ATTENTE_DECHARGEMENT': '#009688',
      'EN_ATTENTE_HYGIENE': '#00BCD4',
      'TERMINEE': '#4CAF50',
    };
    return colors[status] || '#757575';
  };

  const displayTours = getFilteredTours();
  const counts = getCounts();

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' });
  };

  const renderFilterButtons = () => (
    <ScrollView ref={filterScrollRef} horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView} contentContainerStyle={styles.filterScrollContent}>
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
    const showMarkArrival = isEnRoute(tour);
    const showAuthorizeExit = isReadyToExit(tour);
    const waitingChargement = isWaitingForChargement(tour);
    const waitingDechargement = isWaitingForDechargement(tour);
    const beingProcessed = isBeingProcessed(tour);

    return (
      <Card key={tour.id} style={[
        styles.tourCard, 
        showMarkArrival && styles.tourCardEnRoute,
        showAuthorizeExit && styles.tourCardReadyToExit,
        waitingChargement && styles.tourCardWaiting,
      ]}>
        <Card.Content style={styles.cardContent}>
          {/* Header - RTL */}
          <View style={styles.tourHeader}>
            <View style={[styles.statusBadge, { backgroundColor: getTourStatusColor(tour.statut) }]}>
              <Text style={styles.statusText}>{getTourStatusLabel(tour.statut)}</Text>
            </View>
            <View style={styles.tourHeaderRight}>
              <Text style={styles.driverName}>{tour.driver?.nom_complet || AR.driver}</Text>
              <MatriculeText matricule={tour.matricule_vehicule} size="small" />
            </View>
          </View>

          {/* Info Row - RTL */}
          <View style={styles.infoRow}>
            {tour.poids_a_vide && (
              <View style={styles.infoItem}>
                <Text style={[styles.infoText, { color: '#9C27B0' }]}>{tour.poids_a_vide}</Text>
                <Text style={[styles.infoText, { color: '#9C27B0' }]}>{AR.kgEmpty}</Text>
                <MaterialCommunityIcons name="scale" size={14} color="#9C27B0" />
              </View>
            )}
            {tour.nbre_caisses_depart > 0 && (
              <View style={styles.infoItem}>
                <Text style={styles.infoText}>{tour.nbre_caisses_depart}</Text>
                <Text style={styles.infoText}>{AR.crates}</Text>
                <MaterialCommunityIcons name="package-variant" size={14} color="#666" />
              </View>
            )}
            {tour.secteur && (
              <View style={styles.infoItem}>
                <Text style={styles.infoText}>{tour.secteur.nom}</Text>
                <MaterialCommunityIcons name="map-marker" size={14} color="#666" />
              </View>
            )}
          </View>

          {/* Times Row - RTL order: Empty Weight (first) → Exit → Return (last) */}
          <View style={styles.timesRow}>
            <View style={styles.timeItem}>
              <MaterialCommunityIcons name="scale" size={16} color={tour.date_pesee_vide ? '#9C27B0' : '#BDBDBD'} />
              <Text style={styles.timeLabel}>{AR.emptyWeight}</Text>
              <Text style={[styles.timeValue, tour.date_pesee_vide && styles.timeValueActive]}>{formatTime(tour.date_pesee_vide)}</Text>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeItem}>
              <MaterialCommunityIcons name="arrow-up-circle" size={16} color={tour.date_sortie_securite ? '#2196F3' : '#BDBDBD'} />
              <Text style={styles.timeLabel}>{AR.exit}</Text>
              <Text style={[styles.timeValue, tour.date_sortie_securite && styles.timeValueActive]}>{formatTime(tour.date_sortie_securite)}</Text>
            </View>
            <View style={styles.timeDivider} />
            <View style={styles.timeItem}>
              <MaterialCommunityIcons name="arrow-down-circle" size={16} color={tour.date_retour_securite ? '#FF9800' : '#BDBDBD'} />
              <Text style={styles.timeLabel}>{AR.return}</Text>
              <Text style={[styles.timeValue, tour.date_retour_securite && styles.timeValueActive]}>{formatTime(tour.date_retour_securite)}</Text>
            </View>
          </View>

          {tour.poids_brut_securite_sortie && (
            <View style={styles.weightRow}>
              {tour.poids_a_vide && (
                <View style={styles.weightItem}>
                  <Text style={styles.weightLabel}>{AR.netWeight}</Text>
                  <Text style={[styles.weightValue, { color: '#2E7D32' }]}>{(tour.poids_brut_securite_sortie - tour.poids_a_vide).toFixed(1)} {AR.kg}</Text>
                </View>
              )}
              <View style={styles.weightItem}>
                <Text style={styles.weightLabel}>{AR.loadedWeight}</Text>
                <Text style={styles.weightValue}>{tour.poids_brut_securite_sortie} {AR.kg}</Text>
              </View>
            </View>
          )}

          {waitingChargement && (
            <View style={styles.statusIndicator}>
              <Text style={[styles.statusIndicatorText, { color: '#673AB7' }]}>{AR.waitingForLoading}</Text>
              <MaterialCommunityIcons name="package-variant" size={16} color="#673AB7" />
            </View>
          )}
          {waitingDechargement && (
            <View style={styles.statusIndicator}>
              <Text style={[styles.statusIndicatorText, { color: '#FF9800' }]}>{AR.waitingForUnloading}</Text>
              <MaterialCommunityIcons name="package-down" size={16} color="#FF9800" />
            </View>
          )}
          {beingProcessed && (
            <View style={styles.statusIndicator}>
              <Text style={[styles.statusIndicatorText, { color: '#009688' }]}>{tour.statut === 'EN_ATTENTE_HYGIENE' ? AR.hygieneCheck : AR.unloadingInProgress}</Text>
              <MaterialCommunityIcons name={tour.statut === 'EN_ATTENTE_HYGIENE' ? 'spray' : 'package-down'} size={16} color="#009688" />
            </View>
          )}
        </Card.Content>
        
        {(showPeseeSortie || showMarkArrival || showAuthorizeExit) && (
          <Card.Actions style={styles.cardActions}>
            {showAuthorizeExit && (
              <Button mode="contained" icon="exit-run" style={[styles.actionButton, { backgroundColor: '#4CAF50' }]} labelStyle={styles.actionButtonLabel} onPress={() => handleAuthorizeExit(tour.id)}>{AR.authorizeExitBtn}</Button>
            )}
            {showMarkArrival && (
              <Button mode="contained" icon="map-marker-check" style={[styles.actionButton, { backgroundColor: '#FF9800' }]} labelStyle={styles.actionButtonLabel} onPress={() => handleMarkArrival(tour.id)}>{AR.markArrivalBtn}</Button>
            )}
            {showPeseeSortie && (
              <Button mode="contained" icon="scale" style={[styles.actionButton, { backgroundColor: '#2196F3' }]} labelStyle={styles.actionButtonLabel} onPress={() => navigation.navigate('PeseeSortie', { tourId: tour.id })}>{AR.exitWeighingBtn}</Button>
            )}
          </Card.Actions>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header - RTL */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Title style={styles.headerTitle}>{AR.security}</Title>
            <Text style={styles.headerSubtitle}>{AR.securitySubtitle}</Text>
          </View>
          <View style={styles.headerIcon}>
            <MaterialCommunityIcons name="shield-check" size={36} color="#fff" />
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Search Card */}
        <Card style={styles.searchCard}>
          <Card.Content style={styles.searchCardContent}>
            <Text style={styles.searchLabel}>{AR.searchByPlate}</Text>
            <View style={styles.searchContainer}>
              {searchQuery && <IconButton icon="close-circle" size={28} iconColor="#F44336" style={styles.clearButton} onPress={clearSearch} />}
              <View style={styles.plateSearchContainer}>
                <View style={styles.plateSearchInner}>
                  <RNTextInput value={serieNumber} onChangeText={(text) => { const cleaned = text.replace(/[^0-9]/g, '').slice(0, 3); handleMatriculeSearch(cleaned, uniqueNumber); }} keyboardType="numeric" maxLength={3} style={styles.leftSearchInput} placeholder="123" placeholderTextColor="#666" />
                  <View style={styles.arabicSearchSection}><Text style={styles.arabicSearchText}>تونس</Text></View>
                  <RNTextInput value={uniqueNumber} onChangeText={(text) => { const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4); handleMatriculeSearch(serieNumber, cleaned); }} keyboardType="numeric" maxLength={4} style={styles.rightSearchInput} placeholder="4567" placeholderTextColor="#666" />
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>

        {renderFilterButtons()}

        {loading && <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#3F51B5" /><Text style={styles.loadingText}>{AR.loading}</Text></View>}

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {!loading && displayTours.length === 0 && (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons name="truck-outline" size={48} color="#BDBDBD" />
                <Text style={styles.emptyText}>
                  {searchQuery.trim() ? AR.noVehicleForPlate 
                    : activeFilter === 'pesee_sortie' ? AR.noVehicleWaiting 
                    : activeFilter === 'en_route' ? AR.noVehicleOnRoute 
                    : activeFilter === 'pret_sortir' ? AR.noVehicleReady
                    : AR.noToursToday}
                </Text>
                {searchQuery.trim() && <Button mode="text" onPress={clearSearch} style={styles.clearSearchButton}>{AR.clearSearch}</Button>}
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
  header: { backgroundColor: '#3F51B5', paddingTop: Platform.OS === 'ios' ? 50 : 40, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 6 },
  headerContent: { flexDirection: 'row-reverse', alignItems: 'center' },
  headerIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  headerTextContainer: { flex: 1, alignItems: 'flex-end' },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  headerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  content: { flex: 1, padding: 15 },
  searchCard: { marginBottom: 12, elevation: 2, borderRadius: 12 },
  searchCardContent: { paddingVertical: 12 },
  searchLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 10, textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  searchContainer: { flexDirection: 'row-reverse', alignItems: 'center' },
  plateSearchContainer: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 3, elevation: 3 },
  plateSearchInner: { backgroundColor: '#000', borderRadius: 6, borderWidth: 2.5, borderColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingVertical: 6, minHeight: 48 },
  leftSearchInput: { width: 60, fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center', padding: 0 },
  arabicSearchSection: { paddingHorizontal: 8, paddingVertical: 2 },
  arabicSearchText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  rightSearchInput: { width: 75, fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center', padding: 0 },
  clearButton: { marginRight: 8, backgroundColor: '#FFEBEE' },
  filterScrollView: { marginBottom: 12, maxHeight: 50 },
  filterScrollContent: { paddingLeft: 10, gap: 8, flexDirection: 'row-reverse' },
  filterButton: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  filterButtonText: { fontSize: 13, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  filterBadge: { minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  filterBadgeText: { fontSize: 11, fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  loadingText: { marginTop: 10, color: '#666', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  emptyCard: { marginTop: 20, backgroundColor: '#E3F2FD', borderRadius: 12 },
  emptyContent: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { textAlign: 'center', color: '#1976D2', fontSize: 16, fontWeight: '500', marginTop: 15, fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  clearSearchButton: { marginTop: 10 },
  tourCard: { marginBottom: 12, elevation: 3, borderRadius: 12, backgroundColor: '#fff' },
  tourCardEnRoute: { borderRightWidth: 4, borderRightColor: '#FF9800' },
  tourCardReadyToExit: { borderRightWidth: 4, borderRightColor: '#4CAF50' },
  tourCardWaiting: { borderRightWidth: 4, borderRightColor: '#9C27B0' },
  cardContent: { paddingVertical: 12, paddingHorizontal: 14 },
  tourHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tourHeaderRight: { flex: 1, alignItems: 'flex-end', gap: 4 },
  driverName: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  infoRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12, marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 13, color: '#666', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  timesRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#FAFAFA', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 8, marginBottom: 10 },
  timeItem: { alignItems: 'center', gap: 2 },
  timeLabel: { fontSize: 10, color: '#888', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  timeValue: { fontSize: 12, fontWeight: 'bold', color: '#BDBDBD' },
  timeValueActive: { color: '#1a1a1a' },
  timeDivider: { width: 1, height: 30, backgroundColor: '#E0E0E0' },
  weightRow: { flexDirection: 'row-reverse', gap: 20, backgroundColor: '#E8F5E9', borderRadius: 8, padding: 10, marginBottom: 10 },
  weightItem: { alignItems: 'center' },
  weightLabel: { fontSize: 10, color: '#666', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  weightValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  statusIndicator: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: '#F5F5F5', borderRadius: 8, padding: 8 },
  statusIndicatorText: { fontSize: 12, fontWeight: '500', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  cardActions: { justifyContent: 'flex-start', paddingHorizontal: 12, paddingBottom: 12, paddingTop: 0, flexDirection: 'row-reverse' },
  actionButton: { borderRadius: 8, flex: 1 },
  actionButtonLabel: { fontSize: 13, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
});
