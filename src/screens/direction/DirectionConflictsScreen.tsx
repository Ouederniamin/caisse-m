import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, TextInput as RNTextInput, TouchableOpacity } from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  Chip,
  Snackbar,
  Badge,
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import offlineService, { ConflictSummary } from '../../services/offlineService';
import MatriculeText from '../../components/MatriculeText';

export default function DirectionConflictsScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictSummary[]>([]);
  
  // Search state
  const [serieNumber, setSerieNumber] = useState('');
  const [uniqueNumber, setUniqueNumber] = useState('');
  
  // UI state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const conflictsResult = await offlineService.getConflicts(forceRefresh);
      setConflicts(conflictsResult.data);
    } catch (error) {
      console.error('Load conflicts error:', error);
      showSnackbar('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  }, []);

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const clearSearch = () => {
    setSerieNumber('');
    setUniqueNumber('');
  };

  const hasActiveSearch = serieNumber.trim() || uniqueNumber.trim();

  const filterConflicts = (list: ConflictSummary[]): ConflictSummary[] => {
    if (!hasActiveSearch) return list;
    
    return list.filter(conflict => {
      const matricule = conflict.matricule?.toLowerCase() || '';
      const matriculeNumbers = conflict.matricule?.replace(/[^0-9]/g, '') || '';
      
      const serieMatch = !serieNumber.trim() || matricule.includes(serieNumber);
      const uniqueMatch = !uniqueNumber.trim() || matriculeNumbers.includes(uniqueNumber);
      
      return serieMatch && uniqueMatch;
    });
  };

  const filteredConflicts = filterConflicts(conflicts);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerContent}>
            <Title style={styles.headerTitle}>⚠️ Conflits</Title>
            <Text style={styles.headerSubtitle}>Gestion des écarts</Text>
          </View>
          <View style={styles.headerBadge}>
            {conflicts.length > 0 && (
              <Badge size={24} style={styles.badge}>{conflicts.length}</Badge>
            )}
          </View>
        </View>
      </View>

      {/* Search Card - Hygiène Style */}
      <Card style={styles.searchCard}>
        <Card.Content style={styles.searchCardContent}>
          <Text style={styles.searchLabel}>🔍 Recherche par matricule</Text>
          
          <View style={styles.searchContainer}>
            <View style={styles.plateSearchContainer}>
              <View style={styles.plateSearchInner}>
                <RNTextInput
                  value={serieNumber}
                  onChangeText={(t) => setSerieNumber(t.replace(/[^0-9]/g, '').slice(0, 3))}
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
                  onChangeText={(t) => setUniqueNumber(t.replace(/[^0-9]/g, '').slice(0, 4))}
                  keyboardType="numeric"
                  maxLength={4}
                  style={styles.rightSearchInput}
                  placeholder="4567"
                  placeholderTextColor="#666"
                />
              </View>
            </View>
            
            {hasActiveSearch && (
              <TouchableOpacity style={styles.clearSearchButton} onPress={clearSearch}>
                <Text style={styles.clearIcon}>❌</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card.Content>
      </Card>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Search results count */}
        {hasActiveSearch && (
          <Text style={styles.resultsCount}>
            {filteredConflicts.length} résultat{filteredConflicts.length !== 1 ? 's' : ''}
          </Text>
        )}

        {filteredConflicts.length === 0 && !loading ? (
          <Card style={hasActiveSearch ? styles.emptyCard : styles.emptyCardSuccess}>
            <Card.Content>
              <Text style={hasActiveSearch ? styles.emptyText : styles.emptyTextSuccess}>
                {hasActiveSearch ? '🔍 Aucun conflit trouvé' : '✅ Aucun conflit en attente'}
              </Text>
              {hasActiveSearch && (
                <Button mode="text" onPress={clearSearch} style={{ marginTop: 8 }}>
                  Effacer la recherche
                </Button>
              )}
            </Card.Content>
          </Card>
        ) : (
          filteredConflicts.map((conflict) => (
            <Card 
              key={conflict.id} 
              style={[
                styles.conflictCard,
                conflict.depasse_tolerance && styles.conflictCardUrgent,
                conflict.is_surplus && styles.conflictCardSurplus
              ]}
            >
              <Card.Content>
                <View style={styles.conflictHeader}>
                  <View style={styles.conflictInfo}>
                    <Text style={styles.conflictDriver}>{conflict.driver}</Text>
                    <MatriculeText matricule={conflict.matricule} size="small" />
                    <Text style={styles.conflictSecteur}>{conflict.secteur}</Text>
                  </View>
                  <View style={styles.conflictBadges}>
                    {conflict.depasse_tolerance && (
                      <Chip style={styles.urgentChip} textStyle={styles.chipText}>
                        HORS TOLÉRANCE
                      </Chip>
                    )}
                    {conflict.is_surplus && (
                      <Chip style={styles.surplusChip} textStyle={styles.chipText}>
                        SURPLUS
                      </Chip>
                    )}
                  </View>
                </View>

                <View style={styles.conflictStats}>
                  <View style={styles.conflictStat}>
                    <Text style={styles.statNumber}>
                      {conflict.is_surplus ? '+' : '-'}{Math.abs(conflict.quantite_perdue)}
                    </Text>
                    <Text style={styles.statDesc}>Caisses</Text>
                  </View>
                  <View style={styles.conflictStat}>
                    <Text style={styles.statNumber}>{conflict.montant_dette_tnd}</Text>
                    <Text style={styles.statDesc}>TND</Text>
                  </View>
                  <View style={styles.conflictStat}>
                    <Text style={styles.statDate}>{formatDate(conflict.createdAt)}</Text>
                  </View>
                </View>
              </Card.Content>

              <Card.Actions style={styles.conflictActions}>
                <Button
                  mode="contained"
                  icon="eye"
                  buttonColor="#1976D2"
                  onPress={() => navigation.navigate('ConflictDetail', { conflictId: conflict.id })}
                  style={styles.actionBtn}
                >
                  Voir Détails
                </Button>
              </Card.Actions>
            </Card>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#C62828',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  searchCard: {
    margin: 16,
    marginBottom: 8,
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
  clearSearchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearIcon: {
    fontSize: 18,
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
  headerBadge: {
    marginLeft: 16,
  },
  badge: {
    backgroundColor: '#fff',
    color: '#C62828',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  resultsCount: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    marginLeft: 4,
  },
  emptyCard: {
    marginTop: 20,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  emptyCardSuccess: {
    marginTop: 20,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
  },
  emptyTextSuccess: {
    textAlign: 'center',
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },
  conflictCard: {
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  conflictCardUrgent: {
    borderLeftColor: '#F44336',
    backgroundColor: '#FFF8F8',
  },
  conflictCardSurplus: {
    borderLeftColor: '#9C27B0',
    backgroundColor: '#FDF4FF',
  },
  conflictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  conflictInfo: {
    flex: 1,
  },
  conflictDriver: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  conflictSecteur: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  conflictBadges: {
    alignItems: 'flex-end',
  },
  urgentChip: {
    backgroundColor: '#FFEBEE',
    marginBottom: 4,
  },
  surplusChip: {
    backgroundColor: '#F3E5F5',
  },
  chipText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  conflictStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  conflictStat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statDesc: {
    fontSize: 11,
    color: '#666',
  },
  statDate: {
    fontSize: 12,
    color: '#666',
  },
  conflictActions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  actionBtn: {
    flex: 1,
  },
  snackbar: {
    marginBottom: 20,
  },
});
