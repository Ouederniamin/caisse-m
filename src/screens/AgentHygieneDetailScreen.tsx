import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, Image, TouchableOpacity, Platform } from 'react-native';
import {
  Text,
  Card,
  Button,
  TextInput,
  Modal,
  Portal,
} from 'react-native-paper';
import api from '../services/api';
import { API_URL } from '../config';
import MatriculeText from '../components/MatriculeText';
import PhotoUpload from '../components/PhotoUpload';
import { useAuth } from '../context/AuthContext';

// Helper to get full image URL
const getImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  // If already a full URL or data URI, return as-is
  if (url.startsWith('http') || url.startsWith('data:')) {
    return url;
  }
  // Otherwise, prepend the API URL
  return `${API_URL}${url}`;
};

interface AgentHygieneDetailScreenProps {
  route: any;
  navigation: any;
}

export default function AgentHygieneDetailScreen({ route, navigation }: AgentHygieneDetailScreenProps) {
  const { tourId } = route.params;
  const { user } = useAuth();
  const [tour, setTour] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    loadTour();
  }, []);

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
      if (onOk) onOk();
    } else {
      Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const loadTour = async () => {
    try {
      const response = await api.get(`/api/tours/${tourId}`);
      console.log('[HygieneDetail] Tour loaded:', response.data);
      console.log('[HygieneDetail] Photo retour URL:', response.data?.photo_preuve_retour_url);
      console.log('[HygieneDetail] Full image URL:', getImageUrl(response.data?.photo_preuve_retour_url));
      setTour(response.data);
    } catch (error: any) {
      showAlert('Erreur', 'Impossible de charger les détails de la tournée', () => navigation.goBack());
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (url: string) => {
    setPhotoUrls(prev => [...prev, url]);
    showAlert('✅ Photo Ajoutée', `${photoUrls.length + 1} photo(s) uploadée(s)`);
  };

  const removePhoto = (index: number) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Supprimer cette photo?')) {
        const newPhotos = photoUrls.filter((_, i) => i !== index);
        setPhotoUrls(newPhotos);
      }
    } else {
      Alert.alert(
        'Supprimer Photo',
        'Êtes-vous sûr de vouloir supprimer cette photo?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: () => {
              const newPhotos = photoUrls.filter((_, i) => i !== index);
              setPhotoUrls(newPhotos);
            },
          },
        ]
      );
    }
  };

  const handleValidate = () => {
    if (photoUrls.length === 0) {
      showAlert('Photos Requises', 'Veuillez prendre au moins une photo avant de valider');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.patch(`/api/tours/${tourId}/hygiene`, {
        agentHygieneId: user?.id,
        photos_hygiene_urls: photoUrls,
        notes_hygiene: notes,
        statut_hygiene: 'APPROUVE',
      });

      showAlert('Contrôle Terminé', 'Le contrôle d\'hygiène est validé. La tournée est maintenant terminée.', () => navigation.goBack());
    } catch (error: any) {
      showAlert('Erreur', error.response?.data?.error || 'Impossible d\'enregistrer la validation');
    } finally {
      setSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  if (loading || !tour) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🧤 Contrôle Hygiène</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Driver & Vehicle Info */}
        <View style={styles.driverCard}>
          <View style={styles.driverHeader}>
            <Text style={styles.driverName}>{tour.driver?.nom_complet || 'Chauffeur'}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>À contrôler</Text>
            </View>
          </View>
          <MatriculeText matricule={tour.matricule_vehicule} size="small" />
        </View>

        {/* Tour Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Détails Tournée</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Secteur</Text>
              <Text style={styles.infoValue}>{tour.secteur?.nom || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Caisses départ</Text>
              <Text style={styles.infoValue}>{tour.nbre_caisses_depart}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Caisses retour</Text>
              <Text style={styles.infoValue}>{tour.nbre_caisses_retour || 0}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Poids départ</Text>
              <Text style={styles.infoValue}>{tour.poids_net_produits_depart?.toFixed(1) || 0} kg</Text>
            </View>
          </View>
        </View>

        {/* Control Agent Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Agent de Contrôle</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nom</Text>
              <Text style={styles.infoValue}>{tour.agentControle?.name || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Créée le</Text>
              <Text style={styles.infoValue}>{formatDate(tour.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* Security Info */}
        {(tour.securiteSortie || tour.securiteEntree) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛡️ Sécurité</Text>
            <View style={styles.infoCard}>
              {tour.securiteSortie && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Sortie par</Text>
                    <Text style={styles.infoValue}>{tour.securiteSortie?.name || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Date sortie</Text>
                    <Text style={styles.infoValue}>{formatDate(tour.date_sortie_securite)}</Text>
                  </View>
                </>
              )}
              {tour.securiteEntree && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Entrée par</Text>
                    <Text style={styles.infoValue}>{tour.securiteEntree?.name || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Date entrée</Text>
                    <Text style={styles.infoValue}>{formatDate(tour.date_entree_securite)}</Text>
                  </View>
                </>
              )}
              {tour.poids_brut_securite_sortie && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Poids brut sortie</Text>
                  <Text style={styles.infoValue}>{tour.poids_brut_securite_sortie.toFixed(1)} kg</Text>
                </View>
              )}
              {tour.poids_brut_securite_retour && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Poids brut retour</Text>
                  <Text style={styles.infoValue}>{tour.poids_brut_securite_retour.toFixed(1)} kg</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Return Photo */}
        {tour.photo_preuve_retour_url && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📸 Photo Retour (Agent Contrôle)</Text>
            <Image 
              source={{ uri: getImageUrl(tour.photo_preuve_retour_url) || '' }} 
              style={styles.returnPhoto} 
            />
          </View>
        )}

        {/* Hygiene Photos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧹 Photos Inspection</Text>
          <Text style={styles.sectionSubtitle}>Prenez plusieurs photos du matériel retourné</Text>
          
          <PhotoUpload
            onUploadComplete={handlePhotoUpload}
            type="hygiene"
            tourId={tourId}
            label="Photos hygiène"
            multiple={true}
            existingPhotos={photoUrls}
            onPhotosChange={setPhotoUrls}
          />
        </View>

        {/* Notes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Notes d'Inspection</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            multiline
            numberOfLines={3}
            placeholder="État général, anomalies détectées..."
            style={styles.notesInput}
            outlineColor="#ddd"
            activeOutlineColor="#4CAF50"
          />
        </View>

        {/* Validate Button */}
        <View style={styles.decisionSection}>
          <Text style={styles.sectionTitle}>✅ Validation</Text>
          {photoUrls.length === 0 && (
            <Text style={styles.warningText}>⚠️ Au moins une photo requise</Text>
          )}
          <TouchableOpacity
            style={[styles.validateBtn, photoUrls.length === 0 && styles.disabledBtn]}
            onPress={handleValidate}
            disabled={photoUrls.length === 0}
          >
            <Text style={styles.validateBtnText}>✅ Valider le Contrôle</Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxText}>
            ℹ️ Prenez des photos du matériel nettoyé avant de valider
          </Text>
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Portal>
        <Modal
          visible={showConfirmModal}
          onDismiss={() => setShowConfirmModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, styles.approveColor]}>
              ✅ Valider le Contrôle
            </Text>
            
            <View style={styles.modalSummary}>
              <Text style={styles.modalSummaryText}>📸 Photos: {photoUrls.length}</Text>
              <Text style={styles.modalSummaryText}>📝 Notes: {notes ? 'Oui' : 'Non'}</Text>
            </View>

            <Text style={styles.modalMessage}>
              Le contrôle d'hygiène sera validé et la tournée sera marquée comme terminée.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setShowConfirmModal(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.approveBtn]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.modalBtnText}>{submitting ? 'Envoi...' : 'Confirmer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  driverCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    elevation: 2,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  returnPhoto: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 10,
  },
  photoContainer: {
    width: '48%',
    position: 'relative',
  },
  photoThumbnail: {
    width: '100%',
    height: 100,
    borderRadius: 8,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(244,67,54,0.9)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  notesInput: {
    backgroundColor: '#fff',
  },
  decisionSection: {
    marginBottom: 16,
  },
  warningText: {
    color: '#F57C00',
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  validateBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  validateBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  decisionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  decisionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  rejectBtn: {
    backgroundColor: '#F44336',
  },
  approveBtn: {
    backgroundColor: '#4CAF50',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  decisionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  infoBoxText: {
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 20,
  },
  modalContainer: {
    margin: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  approveColor: {
    color: '#4CAF50',
  },
  rejectColor: {
    color: '#F44336',
  },
  modalSummary: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalSummaryText: {
    fontSize: 14,
    color: '#333',
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalCancelText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
