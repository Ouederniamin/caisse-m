import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, Image } from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  TextInput,
  Modal,
  Portal,
  Paragraph,
  Chip,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import MatriculeText from '../components/MatriculeText';

interface AgentHygieneDetailScreenProps {
  route: any;
  navigation: any;
}

export default function AgentHygieneDetailScreen({ route, navigation }: AgentHygieneDetailScreenProps) {
  const { tourId } = route.params;
  const [tour, setTour] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [decision, setDecision] = useState<'APPROUVE' | 'REJETE' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    loadTour();
  }, []);

  const loadTour = async () => {
    try {
      const response = await api.get(`/api/tours/${tourId}`);
      setTour(response.data);
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de charger les détails de la tournée');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission refusée", "Vous devez autoriser l'accès à la caméra.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhotos([...photos, result.assets[0].uri]);
      Alert.alert('✅ Photo Ajoutée', `${photos.length + 1} photo(s) capturée(s)`);
    }
  };

  const removePhoto = (index: number) => {
    Alert.alert(
      'Supprimer Photo',
      'Êtes-vous sûr de vouloir supprimer cette photo?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            const newPhotos = photos.filter((_, i) => i !== index);
            setPhotos(newPhotos);
          },
        },
      ]
    );
  };

  const handleDecision = (status: 'APPROUVE' | 'REJETE') => {
    if (photos.length === 0) {
      Alert.alert('Photos Requises', 'Veuillez prendre au moins une photo avant de valider');
      return;
    }

    setDecision(status);
    setShowConfirmModal(true);
  };

  const handleSubmit = async () => {
    if (!decision) return;

    setSubmitting(true);
    try {
      // In production, upload photos to cloud storage first
      const photoUrls = photos.map(() => 'uploaded_photo_url_placeholder');

      await api.patch(`/api/tours/${tourId}/hygiene`, {
        photos_hygiene_urls: photoUrls,
        notes_hygiene: notes,
        statut_hygiene: decision,
      });

      const message = decision === 'APPROUVE'
        ? '✅ Tournée Approuvée\n\nLa tournée est maintenant terminée.'
        : '❌ Tournée Rejetée\n\nLa tournée est marquée comme terminée avec un rejet.';

      Alert.alert(
        'Hygiène Validée',
        message,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Erreur',
        error.response?.data?.error || 'Impossible d\'enregistrer la validation'
      );
    } finally {
      setSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  if (loading || !tour) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          icon="arrow-left"
          mode="text"
          textColor="#fff"
          onPress={() => navigation.goBack()}
        >
          Retour
        </Button>
        <Title style={styles.headerTitle}>🧤 Contrôle Hygiène</Title>
      </View>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Informations Tournée</Title>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Chauffeur:</Text>
              <Text style={styles.value}>{tour.driver.nom_complet}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Matricule:</Text>
              <View style={styles.matriculeContainer}>
                <MatriculeText matricule={tour.matricule_vehicule} size="small" />
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Secteur:</Text>
              <Text style={styles.value}>{tour.secteur.nom}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Caisses Retour:</Text>
              <Text style={styles.value}>{tour.nbre_caisses_retour || 'N/A'}</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Photos d'Inspection</Title>
            <Paragraph style={styles.instruction}>
              Prenez plusieurs photos du matériel retourné
            </Paragraph>

            <Button
              mode="contained"
              onPress={takePhoto}
              icon="camera"
              style={styles.photoButton}
            >
              Ajouter Photo ({photos.length})
            </Button>

            {photos.length > 0 && (
              <View style={styles.photosGrid}>
                {photos.map((uri, index) => (
                  <View key={index} style={styles.photoContainer}>
                    <Image source={{ uri }} style={styles.photoThumbnail} />
                    <Button
                      mode="text"
                      onPress={() => removePhoto(index)}
                      textColor="#F44336"
                      style={styles.removeButton}
                    >
                      Supprimer
                    </Button>
                  </View>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Notes d'Inspection</Title>
            <Paragraph style={styles.instruction}>
              Ajoutez des observations sur l'état du matériel
            </Paragraph>

            <TextInput
              label="Notes (optionnel)"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              multiline
              numberOfLines={4}
              placeholder="État général, anomalies détectées, recommandations..."
              style={styles.notesInput}
            />
          </Card.Content>
        </Card>

        <Card style={[styles.card, styles.decisionCard]}>
          <Card.Content>
            <Title style={styles.cardTitle}>Décision</Title>
            <View style={styles.decisionButtons}>
              <Button
                mode="contained"
                onPress={() => handleDecision('REJETE')}
                icon="close-circle"
                style={[styles.decisionButton, styles.rejectButton]}
                disabled={photos.length === 0}
              >
                Rejeter
              </Button>
              <Button
                mode="contained"
                onPress={() => handleDecision('APPROUVE')}
                icon="check-circle"
                style={[styles.decisionButton, styles.approveButton]}
                disabled={photos.length === 0}
              >
                Approuver
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Card style={[styles.card, styles.infoCard]}>
          <Card.Content>
            <Paragraph style={styles.infoText}>
              ℹ️ Au moins une photo est requise pour valider le contrôle d'hygiène.
              {'\n\n'}
              • Approuver: Le matériel est propre, la tournée sera terminée
              {'\n'}
              • Rejeter: Le matériel nécessite un nettoyage supplémentaire
            </Paragraph>
          </Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        <Modal
          visible={showConfirmModal}
          onDismiss={() => setShowConfirmModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <Title style={[
                styles.modalTitle,
                decision === 'APPROUVE' ? styles.approveColor : styles.rejectColor
              ]}>
                {decision === 'APPROUVE' ? '✅ Approuver' : '⚠️ Rejeter'}
              </Title>
              
              <View style={styles.modalSummary}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Photos prises:</Text>
                  <Text style={styles.modalValue}>{photos.length}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Notes:</Text>
                  <Text style={styles.modalValue}>
                    {notes ? 'Oui' : 'Non'}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Décision:</Text>
                  <Text style={[
                    styles.modalValue,
                    styles.bold,
                    decision === 'APPROUVE' ? styles.approveColor : styles.rejectColor
                  ]}>
                    {decision === 'APPROUVE' ? 'APPROUVÉ' : 'REJETÉ'}
                  </Text>
                </View>
              </View>

              <Paragraph style={styles.modalMessage}>
                {decision === 'APPROUVE'
                  ? 'La tournée sera marquée comme terminée.'
                  : 'Le matériel devra être nettoyé à nouveau.'}
              </Paragraph>

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setShowConfirmModal(false)}
                  style={styles.modalButton}
                  disabled={submitting}
                >
                  Annuler
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  style={[
                    styles.modalButton,
                    decision === 'APPROUVE' ? styles.approveButton : styles.rejectButton
                  ]}
                  loading={submitting}
                  disabled={submitting}
                >
                  Confirmer
                </Button>
              </View>
            </Card.Content>
          </Card>
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
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 10,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    marginBottom: 20,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  matriculeContainer: {
    alignItems: 'flex-end',
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  photoButton: {
    backgroundColor: '#4CAF50',
    marginTop: 10,
  },
  photosGrid: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoContainer: {
    width: '48%',
    marginBottom: 10,
  },
  photoThumbnail: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  removeButton: {
    marginTop: 5,
  },
  notesInput: {
    marginTop: 10,
  },
  decisionCard: {
    backgroundColor: '#fff',
  },
  decisionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  decisionButton: {
    flex: 1,
    paddingVertical: 8,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  infoCard: {
    backgroundColor: '#E8F5E9',
  },
  infoText: {
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 20,
  },
  modalContainer: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  approveColor: {
    color: '#4CAF50',
  },
  rejectColor: {
    color: '#F44336',
  },
  modalSummary: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
  },
  modalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  bold: {
    fontSize: 16,
  },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
  },
});
