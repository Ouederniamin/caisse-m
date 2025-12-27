import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Alert, Image, Platform } from 'react-native';
import { Text, Card, Title, Button, TextInput, Modal, Portal, Paragraph, Switch, IconButton, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import api from '../services/api';
import MatriculeText from '../components/MatriculeText';

interface TourRetourScreenProps {
  route: any;
  navigation: any;
}

export default function AgentControleRetourScreen({ route, navigation }: TourRetourScreenProps) {
  const { tourId } = route.params;
  const [tour, setTour] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [caisses, setCaisses] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<{ type: 'base64' | 'url'; value: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasChickenProducts, setHasChickenProducts] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
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

  // Process image - converts to base64 on web, uses UploadThing on native
  const processImage = useCallback(async (uri: string) => {
    setPhotoUri(uri);
    setIsProcessing(true);

    if (Platform.OS === 'web') {
      // Web: Use base64 approach
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(',')[1];
          setPhotoData({ type: 'base64', value: base64 });
          setIsProcessing(false);
        };
        reader.onerror = () => {
          Alert.alert('Erreur', 'Impossible de traiter la photo');
          setIsProcessing(false);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('[Retour] Web base64 error:', error);
        Alert.alert('Erreur', 'Impossible de traiter la photo');
        setIsProcessing(false);
      }
    } else {
      // Native: Convert to base64, backend will upload to UploadThing
      try {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setPhotoData({ type: 'base64', value: base64 });
        setIsProcessing(false);
      } catch (error) {
        console.error('[Retour] Native base64 error:', error);
        Alert.alert('Erreur', 'Impossible de traiter la photo');
        setIsProcessing(false);
      }
    }
  }, []);

  // Take photo with camera
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la caméra');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[Retour] Camera error:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  // Pick photo from gallery
  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la galerie');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[Retour] Gallery error:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner la photo');
    }
  };

  const removePhoto = () => {
    Alert.alert('Supprimer la photo', 'Êtes-vous sûr ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => { 
        setPhotoUri(null); 
        setPhotoData(null); 
      }},
    ]);
  };

  const validateAndConfirm = () => {
    console.log('[Retour] validateAndConfirm called');
    
    if (!caisses || parseInt(caisses) < 0) {
      if (Platform.OS === 'web') {
        window.alert('Erreur: Veuillez saisir un nombre de caisses valide');
      } else {
        Alert.alert('Erreur', 'Veuillez saisir un nombre de caisses valide');
      }
      return;
    }

    if (!photoData) {
      if (Platform.OS === 'web') {
        window.alert('Photo Requise: Veuillez prendre une photo de preuve avant de continuer');
      } else {
        Alert.alert('Photo Requise', 'Veuillez prendre une photo de preuve avant de continuer');
      }
      return;
    }

    // On web, directly show the confirmation modal
    // On native, use Alert first then show modal
    if (Platform.OS === 'web') {
      console.log('[Retour] Web: showing confirm modal directly');
      setShowConfirmModal(true);
    } else {
      const nbreCaisses = parseInt(caisses);
      const caissesDepart = tour.nbre_caisses_depart;
      const difference = caissesDepart - nbreCaisses;
      const tolerance = tour.driver?.tolerance_caisses_mensuelle || 0;

      let message = `Caisses départ: ${caissesDepart}\nCaisses retour: ${nbreCaisses}\n`;
      
      if (difference > 0) {
        message += `\n⚠️ Manquants: ${difference} caisses\n`;
        if (difference > tolerance) {
          message += `\n🔴 CONFLIT DÉTECTÉ!\nTolérance: ${tolerance} caisses\nDépassement: ${difference - tolerance} caisses`;
        } else {
          message += `\n✅ Dans la tolérance (${tolerance} caisses)`;
        }
      } else if (difference < 0) {
        message += `\n⚠️ Surplus: ${Math.abs(difference)} caisses\n🔴 CONFLIT DÉTECTÉ!`;
      } else {
        message += `\n✅ Aucune différence`;
      }

      Alert.alert(
        'Confirmer le Retour',
        message,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Confirmer', onPress: () => setShowConfirmModal(true) }
        ]
      );
    }
  };

  const handleSubmit = async () => {
    if (!photoData) {
      if (Platform.OS === 'web') {
        window.alert('Photo requise');
      } else {
        Alert.alert('Erreur', 'Photo requise');
      }
      return;
    }

    setSubmitting(true);
    console.log('[Retour] Submitting retour for tour:', tourId);
    console.log('[Retour] Photo type:', photoData.type);
    
    try {
      // Build request body based on photo type
      const requestBody: any = {
        nbre_caisses_retour: parseInt(caisses),
        has_chicken_products: hasChickenProducts,
      };

      if (photoData.type === 'base64') {
        requestBody.photo_preuve_retour_base64 = photoData.value;
      } else {
        requestBody.photo_preuve_retour_url = photoData.value;
      }

      const response = await api.patch(`/api/tours/${tourId}/retour`, requestBody);
      
      console.log('[Retour] Success response:', response.data);

      const nextStepMsg = hasChickenProducts 
        ? 'La tournée est maintenant en attente de vérification hygiène.'
        : 'La tournée est terminée (pas de produits poulet).';

      // Navigate back to home
      const goHome = () => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      };

      if (Platform.OS === 'web') {
        window.alert('✅ Retour Enregistré\n\n' + nextStepMsg);
        goHome();
      } else {
        Alert.alert(
          '✅ Retour Enregistré',
          nextStepMsg,
          [
            {
              text: 'OK',
              onPress: goHome,
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('[Retour] Error:', error.response?.data || error.message || error);
      const errorMsg = error.response?.data?.error || 'Impossible d\'enregistrer le retour';
      if (Platform.OS === 'web') {
        window.alert('Erreur: ' + errorMsg);
      } else {
        Alert.alert('Erreur', errorMsg);
      }
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

  const difference = tour.nbre_caisses_depart - (parseInt(caisses) || 0);
  const hasConflict = difference !== 0 && (difference > (tour.driver?.tolerance_caisses_mensuelle || 0) || difference < 0);

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
        <Title style={styles.headerTitle}>📦 Retour Tournée</Title>
      </View>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Informations Tournée</Title>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Chauffeur:</Text>
              <Text style={styles.value}>{tour.driver?.nom_complet || tour.nom_chauffeur || 'Non assigné'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Matricule:</Text>
              <View style={styles.matriculeContainer}>
                <MatriculeText matricule={tour.matricule_vehicule} size="small" />
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Secteur:</Text>
              <Text style={styles.value}>{tour.secteur?.nom || 'Non défini'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Caisses Départ:</Text>
              <Text style={[styles.value, styles.highlight]}>{tour.nbre_caisses_depart}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Tolérance:</Text>
              <Text style={styles.value}>{tour.driver?.tolerance_caisses_mensuelle || 0} caisses</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Étape 1: Comptage Caisses</Title>
            <Paragraph style={styles.instruction}>
              Comptez le nombre de caisses retournées
            </Paragraph>

            <TextInput
              label="Nombre de caisses retour"
              value={caisses}
              onChangeText={setCaisses}
              mode="outlined"
              keyboardType="numeric"
              placeholder="0"
              style={styles.input}
              left={<TextInput.Icon icon="package-variant" />}
            />

            {caisses && (
              <View style={[
                styles.differenceCard,
                hasConflict ? styles.conflictCard : styles.okCard
              ]}>
                <Text style={styles.differenceLabel}>Différence:</Text>
                <Text style={[
                  styles.differenceValue,
                  difference > 0 ? styles.negative : difference < 0 ? styles.negative : styles.positive
                ]}>
                  {difference > 0 ? `- ${difference}` : difference < 0 ? `+ ${Math.abs(difference)}` : '0'}
                </Text>
                {hasConflict && (
                  <Text style={styles.conflictText}>⚠️ CONFLIT</Text>
                )}
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Étape 2: Photo de Preuve</Title>
            <Paragraph style={styles.instruction}>
              Prenez une photo des caisses retournées
              {Platform.OS !== 'web' && ' (upload automatique)'}
            </Paragraph>

            {isProcessing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Traitement en cours...</Text>
              </View>
            ) : photoUri ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <View style={styles.photoOverlay}>
                  <IconButton 
                    icon="camera" 
                    iconColor="#fff" 
                    size={24} 
                    style={[styles.overlayButton, { backgroundColor: '#2196F3' }]} 
                    onPress={handleTakePhoto} 
                  />
                  <IconButton 
                    icon="delete" 
                    iconColor="#fff" 
                    size={24} 
                    style={[styles.overlayButton, { backgroundColor: '#F44336' }]} 
                    onPress={removePhoto} 
                  />
                </View>
                <View style={styles.successBadge}>
                  <Text style={styles.successText}>
                    {photoData ? '✅ Photo prête' : '⏳ Traitement...'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.photoButtonsRow}>
                <Button 
                  mode="contained" 
                  icon="camera" 
                  onPress={handleTakePhoto} 
                  style={[styles.cameraButton, { flex: 1 }]}
                >
                  Prendre une photo
                </Button>
              </View>
            )}

            {!photoData && !isProcessing && (
              <Text style={styles.requiredHint}>⚠️ Une photo est requise</Text>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Étape 3: Produits Retournés</Title>
            <Paragraph style={styles.instruction}>
              Y a-t-il des produits poulet dans le retour ?
            </Paragraph>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Retour avec produits poulet</Text>
              <Switch
                value={hasChickenProducts}
                onValueChange={setHasChickenProducts}
                color="#4CAF50"
              />
            </View>

            <Paragraph style={styles.switchHint}>
              {hasChickenProducts 
                ? '🐔 Nécessite vérification hygiène' 
                : '📦 Caisses vides uniquement - pas de vérification hygiène'}
            </Paragraph>
          </Card.Content>
        </Card>

        <Card style={[styles.card, styles.actionCard]}>
          <Card.Content>
            <Button
              mode="contained"
              onPress={() => {
                console.log('[Retour] Button pressed, caisses:', caisses, 'photoData:', !!photoData);
                validateAndConfirm();
              }}
              style={styles.submitButton}
              disabled={!caisses || !photoData || isProcessing}
              loading={isProcessing}
              icon="check-circle"
            >
              Valider le Retour
            </Button>
            {(!caisses || !photoData) && !isProcessing && (
              <Text style={{ color: '#666', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                {!caisses && !photoData 
                  ? '⚠️ Saisissez le nombre de caisses et prenez une photo'
                  : !caisses 
                    ? '⚠️ Saisissez le nombre de caisses'
                    : '⚠️ Prenez une photo de preuve'}
              </Text>
            )}
          </Card.Content>
        </Card>

        <Card style={[styles.card, styles.infoCard]}>
          <Card.Content>
            <Paragraph style={styles.infoText}>
              ℹ️ Un conflit sera automatiquement créé si la différence dépasse la tolérance du chauffeur ou s'il y a un surplus.
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
              <Title style={styles.modalTitle}>Confirmer le Retour</Title>
              
              <View style={styles.modalSummary}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Caisses départ:</Text>
                  <Text style={styles.modalValue}>{tour.nbre_caisses_depart}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Caisses retour:</Text>
                  <Text style={styles.modalValue}>{caisses}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Différence:</Text>
                  <Text style={[
                    styles.modalValue,
                    styles.bold,
                    hasConflict ? styles.negative : styles.positive
                  ]}>
                    {difference > 0 ? `- ${difference}` : difference < 0 ? `+ ${Math.abs(difference)}` : '0'}
                  </Text>
                </View>
                {hasConflict && (
                  <View style={styles.conflictWarning}>
                    <Text style={styles.conflictWarningText}>
                      ⚠️ Un conflit sera créé
                    </Text>
                  </View>
                )}
              </View>

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
                  style={[styles.modalButton, styles.confirmButton]}
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
    backgroundColor: '#2196F3',
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
  highlight: {
    color: '#2196F3',
    fontSize: 16,
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  input: {
    marginBottom: 15,
  },
  differenceCard: {
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  okCard: {
    backgroundColor: '#E8F5E9',
  },
  conflictCard: {
    backgroundColor: '#FFEBEE',
  },
  differenceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  differenceValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  positive: {
    color: '#4CAF50',
  },
  negative: {
    color: '#F44336',
  },
  conflictText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F44336',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  switchHint: {
    fontSize: 13,
    color: '#666',
    marginTop: 10,
    fontStyle: 'italic',
  },
  actionCard: {
    backgroundColor: '#fff',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
  },
  infoText: {
    fontSize: 13,
    color: '#1976D2',
  },
  // Photo styles
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  photoPreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  photoOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
  },
  overlayButton: {
    margin: 0,
  },
  successBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  successText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cameraButton: {
    backgroundColor: '#2196F3',
  },
  requiredHint: {
    marginTop: 8,
    fontSize: 13,
    color: '#3F51B5',
  },
  modalContainer: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2196F3',
  },
  modalSummary: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
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
  conflictWarning: {
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  conflictWarningText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F44336',
    textAlign: 'center',
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
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
});
