import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, Image, Platform } from 'react-native';
import { Text, Card, Title, Button, Chip, Divider, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../services/api';
import MatriculeText from '../components/MatriculeText';

interface TourDetailScreenProps {
  route: {
    params: {
      tourId: string;
    };
  };
}

export default function TourDetailScreen({ route }: TourDetailScreenProps) {
  const navigation = useNavigation<any>();
  const { tourId } = route.params;
  const [tour, setTour] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTourDetails();
  }, [tourId]);

  const loadTourDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/tours/${tourId}`);
      setTour(response.data);
    } catch (error: any) {
      console.error('Error loading tour details:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de la tournée');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const statusMap: { [key: string]: { label: string; color: string; icon: string; description: string } } = {
      'PREPARATION': { 
        label: 'Préparation', 
        color: '#6B7280', 
        icon: 'clock-outline',
        description: 'Tournée en cours de préparation'
      },
      'PRET_A_PARTIR': { 
        label: 'Prêt à partir', 
        color: '#2563EB', 
        icon: 'rocket-launch',
        description: 'En attente de la pesée de sortie sécurité'
      },
      'EN_TOURNEE': { 
        label: 'En tournée', 
        color: '#F59E0B', 
        icon: 'truck-fast',
        description: 'Livraison en cours'
      },
      'EN_ATTENTE_DECHARGEMENT': { 
        label: 'Retour', 
        color: '#8B5CF6', 
        icon: 'package-down',
        description: 'Tournée terminée, en attente de déchargement'
      },
      'EN_ATTENTE_HYGIENE': { 
        label: 'Hygiène', 
        color: '#EF4444', 
        icon: 'spray-bottle',
        description: 'En attente de vérification hygiène'
      },
      'TERMINEE': { 
        label: 'Terminée', 
        color: '#10B981', 
        icon: 'check-circle',
        description: 'Tournée clôturée avec succès'
      },
    };
    return statusMap[status] || { label: status, color: '#6B7280', icon: 'help-circle', description: '' };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleMarkReady = async () => {
    Alert.alert(
      'Confirmer',
      'Marquer cette tournée comme "Prêt à partir" ?\n\nLe chauffeur pourra ensuite passer à la pesée sécurité.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              await api.patch(`/api/tours/${tourId}/pret`);
              Alert.alert('✅ Succès', 'Tournée marquée comme prête à partir');
              loadTourDetails();
            } catch (error: any) {
              Alert.alert('Erreur', error.response?.data?.error || 'Impossible de mettre à jour le statut');
            }
          }
        }
      ]
    );
  };

  const handleGererRetour = () => {
    navigation.navigate('AgentControleRetour', { tourId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1D4ED8" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!tour) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Tournée non trouvée</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Retour
        </Button>
      </View>
    );
  }

  const statusInfo = getStatusInfo(tour.statut);
  const hasConflicts = tour.conflicts && tour.conflicts.length > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Button
          icon="arrow-left"
          mode="text"
          textColor="#fff"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          Retour
        </Button>
        <Title style={styles.headerTitle}>📋 Détails Tournée</Title>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <Card style={[styles.statusCard, { borderLeftColor: statusInfo.color }]}>
          <Card.Content style={styles.statusCardContent}>
            <View style={[styles.statusIconContainer, { backgroundColor: statusInfo.color }]}>
              <MaterialCommunityIcons name={statusInfo.icon as any} size={28} color="#fff" />
            </View>
            <View style={styles.statusTextContainer}>
              <Text style={[styles.statusLabel, { color: statusInfo.color }]}>{statusInfo.label}</Text>
              <Text style={styles.statusDescription}>{statusInfo.description}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Driver & Vehicle Info */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="account" size={22} color="#1D4ED8" />
              <Title style={styles.sectionTitle}>Chauffeur & Véhicule</Title>
            </View>
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Chauffeur</Text>
              <Text style={styles.infoValue}>{tour.driver?.nom_complet || tour.nom_chauffeur || 'Non assigné'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Matricule</Text>
              <MatriculeText matricule={tour.matricule_vehicule} size="medium" />
            </View>
            
            {tour.driver?.marque_vehicule && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Marque véhicule</Text>
                <Text style={styles.infoValue}>{tour.driver.marque_vehicule}</Text>
              </View>
            )}
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Secteur</Text>
              <Chip mode="flat" style={styles.sectorChip}>{tour.secteur?.nom || '-'}</Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Caisses Info */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="package-variant" size={22} color="#8B5CF6" />
              <Title style={styles.sectionTitle}>Caisses</Title>
            </View>
            <Divider style={styles.divider} />
            
            <View style={styles.caissesContainer}>
              <View style={styles.caissesBox}>
                <Text style={styles.caissesLabel}>Départ</Text>
                <Text style={styles.caissesValue}>{tour.nbre_caisses_depart}</Text>
              </View>
              
              <View style={styles.caissesArrow}>
                <MaterialCommunityIcons name="arrow-right" size={28} color="#9CA3AF" />
              </View>
              
              <View style={[styles.caissesBox, tour.nbre_caisses_retour !== null && styles.caissesBoxFilled]}>
                <Text style={styles.caissesLabel}>Retour</Text>
                <Text style={[
                  styles.caissesValue,
                  tour.nbre_caisses_retour !== null && tour.nbre_caisses_retour < tour.nbre_caisses_depart && styles.caissesValueWarning
                ]}>
                  {tour.nbre_caisses_retour !== null ? tour.nbre_caisses_retour : '-'}
                </Text>
              </View>
            </View>

            {tour.nbre_caisses_retour !== null && (
              <View style={styles.differenceContainer}>
                <Text style={styles.differenceLabel}>Différence:</Text>
                <Text style={[
                  styles.differenceValue,
                  tour.nbre_caisses_depart - tour.nbre_caisses_retour > 0 ? styles.differenceNegative : styles.differencePositive
                ]}>
                  {tour.nbre_caisses_depart - tour.nbre_caisses_retour > 0 
                    ? `- ${tour.nbre_caisses_depart - tour.nbre_caisses_retour}` 
                    : tour.nbre_caisses_depart - tour.nbre_caisses_retour < 0 
                      ? `+ ${Math.abs(tour.nbre_caisses_depart - tour.nbre_caisses_retour)}`
                      : '0'
                  }
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Timeline / Dates */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="clock-outline" size={22} color="#F59E0B" />
              <Title style={styles.sectionTitle}>Chronologie</Title>
            </View>
            <Divider style={styles.divider} />
            
            <View style={styles.timelineContainer}>
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: '#10B981' }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>Création</Text>
                  <Text style={styles.timelineValue}>{formatDate(tour.createdAt)}</Text>
                </View>
              </View>
              
              {tour.date_sortie_securite && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#F59E0B' }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>Sortie sécurité</Text>
                    <Text style={styles.timelineValue}>{formatDate(tour.date_sortie_securite)}</Text>
                  </View>
                </View>
              )}
              
              {tour.date_entree_securite && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: '#8B5CF6' }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>Retour sécurité</Text>
                    <Text style={styles.timelineValue}>{formatDate(tour.date_entree_securite)}</Text>
                  </View>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Conflicts */}
        {hasConflicts && (
          <Card style={[styles.card, styles.conflictCard]}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="alert-circle" size={22} color="#EF4444" />
                <Title style={[styles.sectionTitle, { color: '#EF4444' }]}>Conflits ({tour.conflicts.length})</Title>
              </View>
              <Divider style={styles.divider} />
              
              {tour.conflicts.map((conflict: any, index: number) => (
                <View key={conflict.id} style={styles.conflictItem}>
                  <View style={styles.conflictRow}>
                    <Text style={styles.conflictLabel}>Caisses perdues</Text>
                    <Text style={styles.conflictValue}>{conflict.quantite_perdue}</Text>
                  </View>
                  <View style={styles.conflictRow}>
                    <Text style={styles.conflictLabel}>Montant dette</Text>
                    <Text style={styles.conflictValueMoney}>{conflict.montant_dette_tnd} TND</Text>
                  </View>
                  <View style={styles.conflictRow}>
                    <Text style={styles.conflictLabel}>Statut</Text>
                    <Chip 
                      mode="flat" 
                      style={[
                        styles.conflictStatusChip,
                        conflict.statut === 'RESOLUE' && styles.conflictResolvedChip
                      ]}
                      textStyle={styles.conflictStatusText}
                    >
                      {conflict.statut}
                    </Chip>
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Photo Evidence */}
        {(tour.photo_preuve_depart_url || tour.photo_preuve_retour_url) && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="camera" size={22} color="#1D4ED8" />
                <Title style={styles.sectionTitle}>Photos</Title>
              </View>
              <Divider style={styles.divider} />
              
              <View style={styles.photosContainer}>
                {tour.photo_preuve_depart_url && (
                  <View style={styles.photoItem}>
                    <Text style={styles.photoLabel}>📤 Départ</Text>
                    <Image 
                      source={{ uri: tour.photo_preuve_depart_url.startsWith('http') 
                        ? tour.photo_preuve_depart_url 
                        : `${api.defaults.baseURL}${tour.photo_preuve_depart_url}`
                      }} 
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  </View>
                )}
                {tour.photo_preuve_retour_url && (
                  <View style={styles.photoItem}>
                    <Text style={styles.photoLabel}>📥 Retour</Text>
                    <Image 
                      source={{ uri: tour.photo_preuve_retour_url.startsWith('http') 
                        ? tour.photo_preuve_retour_url 
                        : `${api.defaults.baseURL}${tour.photo_preuve_retour_url}`
                      }} 
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  </View>
                )}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {tour.statut === 'PREPARATION' && (
            <Button
              mode="contained"
              icon="rocket-launch"
              onPress={handleMarkReady}
              style={[styles.actionButton, { backgroundColor: '#10B981' }]}
              contentStyle={styles.actionButtonContent}
            >
              Marquer Prêt à Partir
            </Button>
          )}
          
          {tour.statut === 'EN_ATTENTE_DECHARGEMENT' && (
            <Button
              mode="contained"
              icon="package-down"
              onPress={handleGererRetour}
              style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
              contentStyle={styles.actionButtonContent}
            >
              Gérer le Retour
            </Button>
          )}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F6FB',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    backgroundColor: '#1D4ED8',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 24,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginLeft: -8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    marginBottom: 16,
    borderRadius: 16,
    borderLeftWidth: 5,
    elevation: 3,
  },
  statusCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 20,
    fontWeight: '700',
  },
  statusDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  divider: {
    marginBottom: 16,
    backgroundColor: '#E5E7EB',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  sectorChip: {
    backgroundColor: '#EEF2FF',
  },
  caissesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
  },
  caissesBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  caissesBoxFilled: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  caissesLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  caissesValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },
  caissesValueWarning: {
    color: '#EF4444',
  },
  caissesArrow: {
    paddingHorizontal: 8,
  },
  differenceContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  differenceLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  differenceValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  differencePositive: {
    color: '#10B981',
  },
  differenceNegative: {
    color: '#EF4444',
  },
  timelineContainer: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 16,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  timelineValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
    marginTop: 2,
  },
  conflictCard: {
    borderColor: '#FEE2E2',
    borderWidth: 1,
    backgroundColor: '#FFF5F5',
  },
  conflictItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  conflictRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  conflictLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  conflictValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  conflictValueMoney: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
  conflictStatusChip: {
    backgroundColor: '#FEE2E2',
  },
  conflictResolvedChip: {
    backgroundColor: '#D1FAE5',
  },
  conflictStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  photosContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  photoItem: {
    flex: 1,
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  photo: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  actionsContainer: {
    marginTop: 8,
    gap: 12,
  },
  actionButton: {
    borderRadius: 14,
  },
  actionButtonContent: {
    paddingVertical: 8,
  },
});
