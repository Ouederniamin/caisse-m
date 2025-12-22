import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput as RNTextInput,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Animated,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from 'react-native';
import {
  Text,
  Button,
  ActivityIndicator,
  Surface,
  Modal,
  Portal,
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MatriculeText from '../components/MatriculeText';
import PhotoUpload from '../components/PhotoUpload';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Step definitions
const STEPS = [
  { key: 'secteurs', title: 'Secteurs', icon: 'map-marker-radius', description: 'Zones de livraison' },
  { key: 'caisses', title: 'Caisses', icon: 'package-variant', description: 'Nombre de caisses' },
  { key: 'photo', title: 'Photo', icon: 'camera', description: 'Photo du chargement' },
  { key: 'confirm', title: 'Confirmer', icon: 'check-circle', description: 'Valider' },
];

export default function ChargementDetailScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const tourId = route.params?.tourId;

  // Form state
  const [tour, setTour] = useState<any>(null);
  const [secteurs, setSecteurs] = useState<any[]>([]);
  const [selectedSecteurs, setSelectedSecteurs] = useState<any[]>([]);
  const [nbreCaisses, setNbreCaisses] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  
  // UI state
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSecteurModal, setShowSecteurModal] = useState(false);
  
  // Animation
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadData();
  }, [tourId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tourResponse, secteursResponse] = await Promise.all([
        api.get(`/api/tours/${tourId}`),
        api.get('/api/secteurs')
      ]);
      setTour(tourResponse.data);
      setSecteurs(secteursResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
      showAlert('Erreur', 'Impossible de charger les données');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const animateToStep = (newStep: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep(newStep);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const toggleSecteur = (secteur: any) => {
    setSelectedSecteurs(prev => {
      const isSelected = prev.some(s => s.id === secteur.id);
      if (isSelected) {
        return prev.filter(s => s.id !== secteur.id);
      } else {
        return [...prev, secteur];
      }
    });
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0:
        if (selectedSecteurs.length === 0) {
          showAlert('Erreur', 'Veuillez sélectionner au moins un secteur');
          return false;
        }
        return true;
      case 1:
        if (!nbreCaisses.trim() || isNaN(parseInt(nbreCaisses)) || parseInt(nbreCaisses) <= 0) {
          showAlert('Erreur', 'Veuillez saisir un nombre de caisses valide');
          return false;
        }
        return true;
      case 2:
        if (!photoBase64) {
          showAlert('Erreur', 'Veuillez prendre une photo du chargement');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
      onOk?.();
    } else {
      Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      animateToStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep === 0) {
      navigation.goBack();
    } else {
      animateToStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.patch(`/api/tours/${tourId}/chargement`, {
        secteurId: selectedSecteurs[0].id,
        secteurIds: selectedSecteurs.map(s => s.id),
        secteurNames: selectedSecteurs.map(s => s.nom).join(', '),
        agentControleId: user?.id,
        nbre_caisses_depart: parseInt(nbreCaisses),
        photo_base64: photoBase64,
      });

      setSubmitting(false);
      
      if (Platform.OS === 'web') {
        window.alert('✅ Succès\n\nChargement effectué!\n\nLe chauffeur peut maintenant aller à la pesée sortie.');
        navigation.navigate('Contrôle');
      } else {
        Alert.alert(
          '✅ Succès',
          'Chargement effectué!\n\nLe chauffeur peut maintenant aller à la pesée sortie.',
          [{ text: 'OK', onPress: () => navigation.navigate('Contrôle') }]
        );
      }
    } catch (error: any) {
      console.error('Error submitting chargement:', error);
      showAlert('Erreur', error.response?.data?.error || 'Erreur lors du chargement');
      setSubmitting(false);
    }
  };

  // Render stepper
  const renderStepper = () => (
    <View style={styles.stepperContainer}>
      {STEPS.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        
        return (
          <React.Fragment key={step.key}>
            <TouchableOpacity 
              style={styles.stepItem}
              onPress={() => index < currentStep && animateToStep(index)}
              disabled={index > currentStep}
            >
              <View style={[
                styles.stepCircle,
                isActive && styles.stepCircleActive,
                isCompleted && styles.stepCircleCompleted,
              ]}>
                {isCompleted ? (
                  <MaterialCommunityIcons name="check" size={14} color="#fff" />
                ) : (
                  <Text style={[styles.stepNumber, (isActive || isCompleted) && styles.stepNumberActive]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text style={[styles.stepTitle, isActive && styles.stepTitleActive]}>
                {step.title}
              </Text>
            </TouchableOpacity>
            {index < STEPS.length - 1 && (
              <View style={[styles.stepLine, isCompleted && styles.stepLineCompleted]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  // Step 1: Secteurs
  const renderSecteursStep = () => (
    <View style={styles.stepContentContainer}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIconCircle}>
          <MaterialCommunityIcons name="map-marker-radius" size={32} color="#3F51B5" />
        </View>
        <Text style={styles.stepMainTitle}>Secteurs de livraison</Text>
        <Text style={styles.stepDescription}>Sélectionnez les zones de livraison</Text>
      </View>

      <View style={styles.inputSection}>
        <TouchableOpacity
          style={[styles.selector, selectedSecteurs.length > 0 && styles.selectorSelected]}
          onPress={() => setShowSecteurModal(true)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons 
            name="map-marker-radius" 
            size={24} 
            color={selectedSecteurs.length > 0 ? '#3F51B5' : '#999'} 
          />
          <Text style={[styles.selectorText, selectedSecteurs.length > 0 && styles.selectorTextSelected]}>
            {selectedSecteurs.length === 0 
              ? 'Appuyez pour sélectionner...' 
              : selectedSecteurs.length === 1 
                ? selectedSecteurs[0].nom 
                : `${selectedSecteurs.length} secteurs sélectionnés`
            }
          </Text>
          <MaterialCommunityIcons 
            name="chevron-down" 
            size={24} 
            color={selectedSecteurs.length > 0 ? '#3F51B5' : '#999'} 
          />
        </TouchableOpacity>

        {/* Selected secteurs chips */}
        {selectedSecteurs.length > 0 && (
          <View style={styles.chipsContainer}>
            {selectedSecteurs.map((secteur) => (
              <TouchableOpacity 
                key={secteur.id} 
                style={styles.chip}
                onPress={() => toggleSecteur(secteur)}
              >
                <Text style={styles.chipText}>{secteur.nom}</Text>
                <MaterialCommunityIcons name="close-circle" size={16} color="#3F51B5" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  // Step 2: Caisses
  const renderCaissesStep = () => (
    <View style={styles.stepContentContainer}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIconCircle}>
          <MaterialCommunityIcons name="package-variant" size={32} color="#3F51B5" />
        </View>
        <Text style={styles.stepMainTitle}>Nombre de caisses</Text>
        <Text style={styles.stepDescription}>Combien de caisses sont chargées?</Text>
      </View>

      <View style={styles.inputSection}>
        <Surface style={styles.inputCard} elevation={2}>
          <View style={styles.caissesInputRow}>
            <MaterialCommunityIcons name="package-variant-closed" size={32} color="#3F51B5" style={styles.caissesIcon} />
            <Text style={styles.caissesLabel}>Nombre:</Text>
            <RNTextInput
              style={styles.caissesInput}
              value={nbreCaisses}
              onChangeText={setNbreCaisses}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor="#BDBDBD"
              maxLength={4}
            />
            <Text style={styles.caissesUnit}>caisses</Text>
          </View>
        </Surface>

        <Text style={styles.hintText}>
          Comptez le nombre total de caisses chargées dans le camion
        </Text>
      </View>
    </View>
  );

  // Step 3: Photo
  const renderPhotoStep = () => (
    <View style={styles.stepContentContainer}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIconCircle}>
          <MaterialCommunityIcons name="camera" size={32} color="#3F51B5" />
        </View>
        <Text style={styles.stepMainTitle}>Photo du chargement</Text>
        <Text style={styles.stepDescription}>Prenez une photo du camion chargé</Text>
      </View>

      <View style={styles.inputSection}>
        <PhotoUpload
          type="depart"
          onUploadComplete={(url: string) => setPhotoBase64(url)}
          label="Prendre une photo"
        />
        
        {photoBase64 && (
          <View style={styles.photoConfirm}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
            <Text style={styles.photoConfirmText}>Photo enregistrée</Text>
          </View>
        )}
      </View>
    </View>
  );

  // Step 4: Confirm
  const renderConfirmStep = () => (
    <View style={styles.stepContentContainer}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIconCircle, { backgroundColor: '#E8F5E9' }]}>
          <MaterialCommunityIcons name="check-circle" size={32} color="#4CAF50" />
        </View>
        <Text style={styles.stepMainTitle}>Confirmation</Text>
        <Text style={styles.stepDescription}>Vérifiez les informations avant validation</Text>
      </View>

      <View style={styles.confirmSection}>
        {/* Vehicle info */}
        <Surface style={styles.confirmCard} elevation={2}>
          <View style={styles.confirmRow}>
            <MaterialCommunityIcons name="truck" size={20} color="#666" />
            <View style={styles.confirmInfo}>
              <Text style={styles.confirmLabel}>Véhicule</Text>
              <Text style={styles.confirmValue}>{tour?.driver?.nom_complet || 'Chauffeur'}</Text>
              <MatriculeText matricule={tour?.matricule_vehicule} size="small" />
            </View>
          </View>
        </Surface>

        {/* Secteurs */}
        <Surface style={styles.confirmCard} elevation={2}>
          <View style={styles.confirmRow}>
            <MaterialCommunityIcons name="map-marker-radius" size={20} color="#3F51B5" />
            <View style={styles.confirmInfo}>
              <Text style={styles.confirmLabel}>Secteurs</Text>
              <Text style={styles.confirmValue}>{selectedSecteurs.map(s => s.nom).join(', ')}</Text>
            </View>
          </View>
        </Surface>

        {/* Caisses */}
        <Surface style={styles.confirmCard} elevation={2}>
          <View style={styles.confirmRow}>
            <MaterialCommunityIcons name="package-variant" size={20} color="#FF9800" />
            <View style={styles.confirmInfo}>
              <Text style={styles.confirmLabel}>Nombre de caisses</Text>
              <Text style={styles.confirmValue}>{nbreCaisses} caisses</Text>
            </View>
          </View>
        </Surface>

        {/* Photo */}
        <Surface style={styles.confirmCard} elevation={2}>
          <View style={styles.confirmRow}>
            <MaterialCommunityIcons name="camera" size={20} color="#4CAF50" />
            <View style={styles.confirmInfo}>
              <Text style={styles.confirmLabel}>Photo</Text>
              <Text style={[styles.confirmValue, { color: '#4CAF50' }]}>✓ Photo prise</Text>
            </View>
          </View>
        </Surface>

        {/* Next step info */}
        <View style={styles.nextStepInfo}>
          <Text style={styles.nextStepTitle}>📋 Prochaine étape</Text>
          <Text style={styles.nextStepText}>Sécurité: Pesée sortie (camion chargé)</Text>
        </View>
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderSecteursStep();
      case 1:
        return renderCaissesStep();
      case 2:
        return renderPhotoStep();
      case 3:
        return renderConfirmStep();
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3F51B5" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <LinearGradient
        colors={['#3F51B5', '#5C6BC0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Chargement</Text>
          <Text style={styles.headerSubtitle}>Étape {currentStep + 1} sur {STEPS.length}</Text>
        </View>
      </LinearGradient>

      {/* Stepper */}
      {renderStepper()}

      {/* Content */}
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {renderStepContent()}
        </Animated.View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        {currentStep < STEPS.length - 1 ? (
          <Button
            mode="contained"
            onPress={handleNext}
            style={styles.nextButton}
            labelStyle={styles.buttonLabel}
            icon="arrow-right"
            contentStyle={styles.buttonContent}
          >
            Suivant
          </Button>
        ) : (
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            style={[styles.nextButton, styles.submitButton]}
            labelStyle={styles.buttonLabel}
            icon="check-circle"
            contentStyle={styles.buttonContent}
          >
            Valider le chargement
          </Button>
        )}
      </View>

      {/* Secteur Selection Modal */}
      <Portal>
        <Modal
          visible={showSecteurModal}
          onDismiss={() => setShowSecteurModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner les secteurs</Text>
            <TouchableOpacity onPress={() => setShowSecteurModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>Appuyez pour sélectionner plusieurs secteurs</Text>
          
          <FlatList
            data={secteurs}
            keyExtractor={(item) => item.id}
            style={styles.secteurList}
            renderItem={({ item }) => {
              const isSelected = selectedSecteurs.some(s => s.id === item.id);
              return (
                <TouchableOpacity
                  style={[styles.secteurItem, isSelected && styles.secteurItemSelected]}
                  onPress={() => toggleSecteur(item)}
                >
                  <MaterialCommunityIcons 
                    name={isSelected ? "checkbox-marked" : "checkbox-blank-outline"}
                    size={24} 
                    color={isSelected ? '#3F51B5' : '#666'} 
                  />
                  <Text style={[styles.secteurItemText, isSelected && styles.secteurItemTextSelected]}>
                    {item.nom}
                  </Text>
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.secteurDivider} />}
          />
          
          <Button 
            mode="contained" 
            onPress={() => setShowSecteurModal(false)}
            style={styles.modalDoneButton}
            labelStyle={{ fontWeight: '600' }}
          >
            Terminé ({selectedSecteurs.length} sélectionné{selectedSecteurs.length > 1 ? 's' : ''})
          </Button>
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  // Stepper
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: '#3F51B5',
  },
  stepCircleCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#999',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepTitle: {
    fontSize: 10,
    color: '#999',
    fontWeight: '500',
  },
  stepTitleActive: {
    color: '#3F51B5',
    fontWeight: '700',
  },
  stepLine: {
    width: 30,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 6,
    marginBottom: 16,
  },
  stepLineCompleted: {
    backgroundColor: '#4CAF50',
  },
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  stepContentContainer: {
    alignItems: 'center',
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stepIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E8EAF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepMainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  inputSection: {
    width: '100%',
    maxWidth: 400,
  },
  // Selector
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  selectorSelected: {
    borderColor: '#3F51B5',
    backgroundColor: '#F5F7FF',
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    color: '#999',
    marginLeft: 12,
  },
  selectorTextSelected: {
    color: '#3F51B5',
    fontWeight: '600',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8EAF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    color: '#3F51B5',
    fontWeight: '500',
  },
  // Caisses input
  inputCard: {
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 16,
  },
  caissesInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caissesIcon: {
    marginRight: 12,
  },
  caissesLabel: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  caissesInput: {
    width: 100,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3F51B5',
    textAlign: 'center',
    backgroundColor: '#F5F7FF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3F51B5',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  caissesUnit: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginLeft: 8,
  },
  hintText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  // Photo
  photoConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  photoConfirmText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  // Confirm
  confirmSection: {
    width: '100%',
    maxWidth: 400,
    gap: 12,
  },
  confirmCard: {
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 16,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  confirmInfo: {
    flex: 1,
  },
  confirmLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  confirmValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  nextStepInfo: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  nextStepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 4,
  },
  nextStepText: {
    fontSize: 13,
    color: '#666',
  },
  // Bottom
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  nextButton: {
    borderRadius: 12,
    paddingVertical: 6,
    backgroundColor: '#3F51B5',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContent: {
    flexDirection: 'row-reverse',
  },
  // Modal
  modalContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#888',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  secteurList: {
    maxHeight: 300,
  },
  secteurItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  secteurItemSelected: {
    backgroundColor: '#F5F7FF',
  },
  secteurItemText: {
    fontSize: 16,
    color: '#333',
  },
  secteurItemTextSelected: {
    color: '#3F51B5',
    fontWeight: '600',
  },
  secteurDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 52,
  },
  modalDoneButton: {
    margin: 16,
    borderRadius: 12,
    backgroundColor: '#3F51B5',
  },
});
