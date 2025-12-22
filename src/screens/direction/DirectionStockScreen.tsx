import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Surface, IconButton } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import MatriculeText from '../../components/MatriculeText';

interface Mouvement {
  id: string;
  type: string;
  quantite: number;
  soldeApres: number;
  notes?: string;
  matricule?: string;
  chauffeurNom?: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface StockData {
  initialise: boolean;
  stockActuel: number;
  stockInitial: number;
  stockEnTournee: number;
  stockPerdu: number;
  sortiesTournees: number;
  stockDisponible: number;
  mouvements: Mouvement[];
  pagination: Pagination;
}

export default function DirectionStockScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stock, setStock] = useState<StockData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/stock?page=${page}&limit=10`);
      setStock(res.data);
      setCurrentPage(page);
    } catch (error) {
      console.error('Stock load error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData(1);
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(1);
    setRefreshing(false);
  }, []);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= (stock?.pagination?.totalPages || 1)) {
      loadData(page);
    }
  };

  const getMouvementLabel = (type: string) => {
    const labels: Record<string, string> = {
      'DEPART_TOURNEE': '🚚 Départ',
      'RETOUR_TOURNEE': '📥 Retour',
      'PERTE': '⚠️ Perte',
      'PERTE_CONFIRMEE': '❌ Perte Confirmée',
      'SURPLUS': '✨ Surplus',
      'ACHAT': '🛒 Achat',
      'AJUSTEMENT': '🔧 Ajustement',
      'INITIALISATION': '🔄 Init',
    };
    return labels[type] || type;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Title style={styles.headerTitle}>Stock Caisses</Title>
          <Text style={styles.headerSubtitle}>Gestion du stock</Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton
            icon="refresh"
            iconColor="#fff"
            size={24}
            onPress={onRefresh}
            disabled={loading}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {stock ? (
          <>
            {/* Main Stock Card */}
            <Card style={styles.mainCard}>
              <Card.Content>
                <View style={styles.mainStockHeader}>
                  <Text style={styles.mainStockIcon}>📦</Text>
                  <Text style={styles.mainStockLabel}>Stock Actuel</Text>
                </View>
                <Text style={styles.mainStockValue}>{stock.stockActuel}</Text>
                <Text style={styles.mainStockUnit}>caisses</Text>
              </Card.Content>
            </Card>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <Surface style={[styles.statCard, { backgroundColor: '#E3F2FD' }]} elevation={2}>
                <Text style={styles.statIcon}>🏭</Text>
                <Text style={[styles.statValue, { color: '#1976D2' }]}>{stock.stockDisponible}</Text>
                <Text style={styles.statLabel}>Disponible</Text>
              </Surface>
              
              <Surface style={[styles.statCard, { backgroundColor: '#FFF3E0' }]} elevation={2}>
                <Text style={styles.statIcon}>🚚</Text>
                <Text style={[styles.statValue, { color: '#E65100' }]}>{stock.stockEnTournee}</Text>
                <Text style={styles.statLabel}>En Tournée</Text>
              </Surface>
              
              <Surface style={[styles.statCard, { backgroundColor: '#F3E5F5' }]} elevation={2}>
                <Text style={styles.statIcon}>📤</Text>
                <Text style={[styles.statValue, { color: '#7B1FA2' }]}>{stock.sortiesTournees || 0}</Text>
                <Text style={styles.statLabel}>Sorties Tournées</Text>
              </Surface>
              
              <Surface style={[styles.statCard, { backgroundColor: '#FFEBEE' }]} elevation={2}>
                <Text style={styles.statIcon}>⚠️</Text>
                <Text style={[styles.statValue, { color: '#C62828' }]}>{stock.stockPerdu}</Text>
                <Text style={styles.statLabel}>Perdues</Text>
              </Surface>
            </View>

            {/* Recent Movements */}
            <Card style={styles.mouvementsCard}>
              <Card.Content>
                <Title style={styles.cardTitle}>📜 Mouvements ({stock.pagination?.total || 0})</Title>
                {stock.mouvements?.length > 0 ? (
                  <>
                    {stock.mouvements.map((m) => (
                      <View key={m.id} style={styles.mouvementRow}>
                        <View style={styles.mouvementInfo}>
                          <Text style={styles.mouvementType}>{getMouvementLabel(m.type)}</Text>
                          {m.matricule && (
                            <View style={styles.mouvementDetails}>
                              <MatriculeText matricule={m.matricule} size="small" />
                              {m.chauffeurNom && <Text style={styles.chauffeurName}>{m.chauffeurNom}</Text>}
                            </View>
                          )}
                        </View>
                        <View style={styles.mouvementValues}>
                          <Text style={[
                            styles.mouvementQty,
                            m.quantite > 0 ? styles.qtyPositive : styles.qtyNegative
                          ]}>
                            {m.quantite > 0 ? '+' : ''}{m.quantite}
                          </Text>
                          <Text style={styles.mouvementSolde}>→ {m.soldeApres}</Text>
                        </View>
                      </View>
                    ))}
                    
                    {/* Pagination */}
                    {stock.pagination && stock.pagination.totalPages > 1 && (
                      <View style={styles.pagination}>
                        <TouchableOpacity
                          style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
                          onPress={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <Text style={[styles.pageButtonText, currentPage === 1 && styles.pageButtonTextDisabled]}>◀ Préc</Text>
                        </TouchableOpacity>
                        
                        <Text style={styles.pageInfo}>
                          {currentPage} / {stock.pagination.totalPages}
                        </Text>
                        
                        <TouchableOpacity
                          style={[styles.pageButton, currentPage === stock.pagination.totalPages && styles.pageButtonDisabled]}
                          onPress={() => goToPage(currentPage + 1)}
                          disabled={currentPage === stock.pagination.totalPages}
                        >
                          <Text style={[styles.pageButtonText, currentPage === stock.pagination.totalPages && styles.pageButtonTextDisabled]}>Suiv ▶</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={styles.emptyText}>Aucun mouvement</Text>
                )}
              </Card.Content>
            </Card>
          </>
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>
                {loading ? 'Chargement...' : 'Stock non initialisé'}
              </Text>
            </Card.Content>
          </Card>
        )}
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
    backgroundColor: '#3F51B5',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  mainCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#1a237e',
  },
  mainStockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  mainStockIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  mainStockLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  mainStockValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  mainStockUnit: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  mouvementsCard: {
    borderRadius: 14,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  mouvementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mouvementInfo: {
    flex: 1,
  },
  mouvementType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  mouvementDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  chauffeurName: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  mouvementMatricule: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  mouvementValues: {
    alignItems: 'flex-end',
  },
  mouvementQty: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  qtyPositive: {
    color: '#4CAF50',
  },
  qtyNegative: {
    color: '#F44336',
  },
  mouvementSolde: {
    fontSize: 12,
    color: '#666',
  },
  emptyCard: {
    marginTop: 20,
    borderRadius: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    padding: 20,
  },
  statCardFull: {
    width: '100%',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  pageButton: {
    backgroundColor: '#3F51B5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pageButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  pageButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  pageButtonTextDisabled: {
    color: '#999',
  },
  pageInfo: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});
