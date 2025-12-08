import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  TextInput,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api';
import MatriculeText from '../components/MatriculeText';

interface PeseeEntreeScreenProps {
  route: any;
  navigation: any;
}

const STEPS = [
  { key: 'info', title: 'Informations', icon: 'information' },
  { key: 'matricule', title: 'Matricule', icon: 'car' },
  { key: 'pesee', title: 'Pesée', icon: 'scale' },
  { key: 'confirm', title: 'Confirmation', icon: 'check-circle' },
];

export default function PeseeEntreeScreen({ route, navigation }: PeseeEntreeScreenProps) {
  const { tourId } = route.params;
  const [tour, setTour] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [poidsInput, setPoidsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [matriculeError, setMatriculeError] = useState('');
  const [matriculeVerified, setMatriculeVerified] = useState(false);

  useEffect(() => {
    loadTour();
  }, []);

  const loadTour = async () => {
    try {
      const response = await api.get(`/api/tours/${tourId}`);
      setTour(response.data);
    } catch (error: any) {
      showAlert('Erreur', 'Impossible de charger les détails de la tournée');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
      onOk?.();
    } else {
      const Alert = require('react-native').Alert;
      Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
    }
  };

  const handleSubmitPesee = async () => {
    if (!poidsInput || parseFloat(poidsInput) <= 0) {
      showAlert('Erreur', 'Veuillez saisir un poids valide');
      return;
    }

    setCurrentStep(3); // Move to confirmation step
  };

  const poidsNet = poidsInput && tour?.poids_brut_securite_sortie
    ? parseFloat(poidsInput) - tour.poids_brut_securite_sortie
    : 0;

  const handleFinalConfirm = async () => {
    setSubmitting(true);
    try {
      await api.patch(`/api/tours/${tourId}/entree`, {
        poids_brut_securite_entree: parseFloat(poidsInput),
        matricule_vehicule: tour.matricule_vehicule,
      });

      showAlert(
        '✅ Pesée Entrée Enregistrée',
        `Le véhicule peut maintenant être déchargé.\n\nPoids brut sortie: ${tour.poids_brut_securite_sortie} kg\nPoids brut retour: ${poidsInput} kg\nDifférence: ${Math.abs(poidsNet).toFixed(2)} kg`,
        () => navigation.goBack()
      );
    } catch (error: any) {
      showAlert(
        'Erreur',
        error.response?.data?.error || "Impossible d'enregistrer la pesée"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const goToStep = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  if (loading || !tour) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const renderStepper = () => (
    <View style={styles.stepperContainer}>
      {STEPS.map((step, index) => {
        const isActive = currentStep === index;
        const isCompleted = currentStep > index;
        const isClickable = index < currentStep;

        return (
          <React.Fragment key={step.key}>
            <TouchableOpacity
              style={styles.stepItem}
              onPress={() => isClickable && goToStep(index)}
              disabled={!isClickable}
            >
              <View
                style={[
                  styles.stepCircle,
                  isActive && styles.stepCircleActive,
                  isCompleted && styles.stepCircleCompleted,
                ]}
              >
                {isCompleted ? (
                  <MaterialCommunityIcons name="check" size={18} color="#fff" />
                ) : (
                  <MaterialCommunityIcons
                    name={step.icon as any}
                    size={18}
                    color={isActive ? '#fff' : '#9E9E9E'}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  isActive && styles.stepLabelActive,
                  isCompleted && styles.stepLabelCompleted,
                ]}
              >
                {step.title}
              </Text>
            </TouchableOpacity>
            {index < STEPS.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  isCompleted && styles.stepLineCompleted,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  const renderInfoStep = () => (
    <Card style={styles.stepCard}>
      <Card.Content>
        <View style={styles.stepHeader}>
          <MaterialCommunityIcons name="truck" size={28} color="#9C27B0" />
          <Title style={styles.stepTitle}>Informations Tournée</Title>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="account" size={22} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Chauffeur</Text>
              <Text style={styles.infoValue}>
                {tour.driver?.nom_complet || 'Non assigné'}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="car" size={22} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Matricule</Text>
              <View style={styles.matriculeDisplay}>
                <MatriculeText matricule={tour.matricule_vehicule} size="small" />
              </View>
            </View>
          </View>

          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="map-marker" size={22} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Secteur</Text>
              <Text style={styles.infoValue}>{tour.secteur?.nom || 'N/A'}</Text>
            </View>
          </View>

          <View style={[styles.infoItem, styles.highlightItem]}>
            <MaterialCommunityIcons name="scale" size={22} color="#2196F3" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Poids Sortie</Text>
              <Text style={[styles.infoValue, { color: '#2196F3' }]}>
                {tour.poids_brut_securite_sortie || 0} kg
              </Text>
            </View>
          </View>

          {tour.date_sortie_securite && (
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="clock-outline" size={22} color="#FF9800" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Heure de Départ</Text>
                <Text style={[styles.infoValue, { color: '#FF9800' }]}>
                  {new Date(tour.date_sortie_securite).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          )}
        </View>

        <Button
          mode="contained"
          onPress={() => setCurrentStep(1)}
          style={[styles.nextButton, { backgroundColor: '#9C27B0' }]}
          icon="arrow-right"
          contentStyle={styles.nextButtonContent}
        >
          Continuer
        </Button>
      </Card.Content>
    </Card>
  );

  // Handlers for matricule confirmation
  const handleConfirmMatricule = () => {
    setMatriculeVerified(true);
    setMatriculeError('');
    setCurrentStep(2);
  };

  const handleRejectMatricule = () => {
    setMatriculeError('Le matricule ne correspond pas au véhicule attendu. Veuillez vérifier ou contacter votre superviseur.');
    setMatriculeVerified(false);
  };

  const renderMatriculeStep = () => (
    <Card style={styles.stepCard}>
      <Card.Content>
        <View style={styles.stepHeader}>
          <MaterialCommunityIcons name="car-side" size={28} color="#9C27B0" />
          <Title style={styles.stepTitle}>Vérification Matricule</Title>
        </View>

        <Text style={styles.stepDescription}>
          Vérifiez que le matricule du véhicule de retour correspond
        </Text>

        {/* Expected Matricule Display */}
        <View style={styles.matriculeCheckContainer}>
          <Text style={styles.matriculeCheckLabel}>Le véhicule porte-t-il ce matricule ?</Text>
          <View style={styles.matriculeCheckPlate}>
            <MatriculeText matricule={tour.matricule_vehicule} size="large" />
          </View>
        </View>

        {matriculeError ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#D32F2F" />
            <Text style={styles.errorText}>{matriculeError}</Text>
          </View>
        ) : null}

        <View style={styles.confirmButtonsRow}>
          <TouchableOpacity
            style={styles.noButton}
            onPress={handleRejectMatricule}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="close-circle" size={28} color="#fff" />
            <Text style={styles.noButtonText}>Non</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.yesButton}
            onPress={handleConfirmMatricule}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="check-circle" size={28} color="#fff" />
            <Text style={styles.yesButtonText}>Oui, correct</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.backLinkContainer}
          onPress={() => setCurrentStep(0)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#9C27B0" />
          <Text style={[styles.backLinkText, { color: '#9C27B0' }]}>Retour</Text>
        </TouchableOpacity>
      </Card.Content>
    </Card>
  );

  const renderPeseeStep = () => (
    <Card style={styles.stepCard}>
      <Card.Content>
        <View style={styles.stepHeader}>
          <MaterialCommunityIcons name="scale" size={28} color="#9C27B0" />
          <Title style={styles.stepTitle}>Pesée Retour</Title>
        </View>

        <View style={styles.verifiedBadge}>
          <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.verifiedText}>Matricule vérifié</Text>
          <MatriculeText matricule={tour.matricule_vehicule} size="small" />
        </View>

        {/* Weight Comparison */}
        <View style={styles.weightComparison}>
          <View style={styles.weightCompItem}>
            <MaterialCommunityIcons name="arrow-up-bold-circle" size={24} color="#2196F3" />
            <Text style={styles.weightCompLabel}>Poids Sortie</Text>
            <Text style={[styles.weightCompValue, { color: '#2196F3' }]}>
              {tour.poids_brut_securite_sortie || 0} kg
            </Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#BDBDBD" />
          <View style={styles.weightCompItem}>
            <MaterialCommunityIcons name="arrow-down-bold-circle" size={24} color="#9C27B0" />
            <Text style={styles.weightCompLabel}>Poids Retour</Text>
            <Text style={[styles.weightCompValue, { color: '#9C27B0' }]}>
              {poidsInput ? `${poidsInput} kg` : '---'}
            </Text>
          </View>
        </View>

        <Text style={styles.inputLabel}>Poids brut retour (kg):</Text>
        <View style={styles.weightInputContainer}>
          <MaterialCommunityIcons name="scale" size={24} color="#9C27B0" />
          <TextInput
            value={poidsInput}
            onChangeText={setPoidsInput}
            mode="outlined"
            keyboardType="numeric"
            placeholder="0.00"
            style={styles.weightInput}
            outlineColor="#9C27B0"
            activeOutlineColor="#9C27B0"
          />
          <Text style={styles.weightUnit}>kg</Text>
        </View>

        {poidsInput && parseFloat(poidsInput) > 0 && (
          <View style={[styles.netWeightCard, poidsNet >= 0 ? styles.netPositive : styles.netNegative]}>
            <MaterialCommunityIcons 
              name="scale-balance" 
              size={24} 
              color={poidsNet >= 0 ? '#2E7D32' : '#C62828'} 
            />
            <View>
              <Text style={styles.netWeightLabel}>Différence (Net)</Text>
              <Text style={[styles.netWeightValue, { color: poidsNet >= 0 ? '#2E7D32' : '#C62828' }]}>
                {poidsNet >= 0 ? '+' : ''}{poidsNet.toFixed(2)} kg
              </Text>
            </View>
          </View>
        )}

        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={() => setCurrentStep(1)}
            style={styles.backButton}
            icon="arrow-left"
          >
            Retour
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmitPesee}
            style={[styles.nextButton, { backgroundColor: '#9C27B0' }]}
            icon="arrow-right"
            disabled={!poidsInput || parseFloat(poidsInput) <= 0}
          >
            Continuer
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  const renderConfirmStep = () => (
    <Card style={styles.stepCard}>
      <Card.Content>
        <View style={styles.stepHeader}>
          <MaterialCommunityIcons name="check-circle-outline" size={28} color="#4CAF50" />
          <Title style={styles.stepTitle}>Confirmation</Title>
        </View>

        <Text style={styles.stepDescription}>
          Vérifiez les informations avant de confirmer la pesée entrée
        </Text>

        <View style={styles.confirmSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Chauffeur</Text>
            <Text style={styles.summaryValue}>
              {tour.driver?.nom_complet || 'Non assigné'}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Véhicule</Text>
            <MatriculeText matricule={tour.matricule_vehicule} size="small" />
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Poids Sortie</Text>
            <Text style={styles.summaryValue}>{tour.poids_brut_securite_sortie || 0} kg</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Poids Retour</Text>
            <Text style={styles.summaryValue}>{poidsInput} kg</Text>
          </View>

          <View style={[styles.summaryRow, styles.summaryHighlight]}>
            <Text style={styles.summaryLabelBold}>Différence (Net)</Text>
            <Text style={[styles.summaryValueBold, { color: poidsNet >= 0 ? '#2E7D32' : '#C62828' }]}>
              {poidsNet >= 0 ? '+' : ''}{poidsNet.toFixed(2)} kg
            </Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={() => setCurrentStep(2)}
            style={styles.backButton}
            icon="arrow-left"
            disabled={submitting}
          >
            Retour
          </Button>
          <Button
            mode="contained"
            onPress={handleFinalConfirm}
            style={styles.confirmButton}
            icon="check"
            loading={submitting}
            disabled={submitting}
          >
            Confirmer
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderInfoStep();
      case 1:
        return renderMatriculeStep();
      case 2:
        return renderPeseeStep();
      case 3:
        return renderConfirmStep();
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButtonHeader} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <MaterialCommunityIcons name="scale" size={32} color="#fff" />
          <Title style={styles.headerTitle}>Pesée Entrée</Title>
        </View>
      </View>

      {/* Stepper */}
      {renderStepper()}

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {renderCurrentStep()}
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#9C27B0',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  backButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 5,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: -15,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepCircleActive: {
    backgroundColor: '#9C27B0',
  },
  stepCircleCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepLabel: {
    fontSize: 10,
    color: '#9E9E9E',
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#9C27B0',
    fontWeight: 'bold',
  },
  stepLabelCompleted: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  stepLine: {
    width: 30,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 5,
    marginBottom: 20,
  },
  stepLineCompleted: {
    backgroundColor: '#4CAF50',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  contentContainer: {
    paddingBottom: 30,
  },
  stepCard: {
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  infoGrid: {
    gap: 15,
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 10,
  },
  highlightItem: {
    backgroundColor: '#E3F2FD',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  matriculeDisplay: {
    marginTop: 4,
  },
  nextButton: {
    borderRadius: 10,
    marginTop: 10,
  },
  nextButtonContent: {
    flexDirection: 'row-reverse',
  },
  expectedMatricule: {
    backgroundColor: '#F3E5F5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
    gap: 8,
  },
  expectedLabel: {
    fontSize: 13,
    color: '#7B1FA2',
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  plateInputContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    marginBottom: 15,
  },
  plateInputInner: {
    backgroundColor: '#000',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 60,
  },
  plateLeftInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    padding: 0,
    backgroundColor: 'transparent',
  },
  plateArabicSection: {
    paddingHorizontal: 15,
    paddingVertical: 4,
  },
  plateArabicText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  plateRightInput: {
    flex: 1.3,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    padding: 0,
    backgroundColor: 'transparent',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  successText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  backButton: {
    flex: 1,
    borderRadius: 10,
  },
  verifyButton: {
    flex: 1.5,
    borderRadius: 10,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  verifiedText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  weightComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  weightCompItem: {
    alignItems: 'center',
    flex: 1,
  },
  weightCompLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  weightCompValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  weightInput: {
    flex: 1,
    backgroundColor: '#fff',
    fontSize: 20,
  },
  weightUnit: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  netWeightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  netPositive: {
    backgroundColor: '#E8F5E9',
  },
  netNegative: {
    backgroundColor: '#FFEBEE',
  },
  netWeightLabel: {
    fontSize: 12,
    color: '#666',
  },
  netWeightValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  confirmSummary: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  summaryHighlight: {
    backgroundColor: '#F3E5F5',
    marginHorizontal: -15,
    marginBottom: -15,
    marginTop: 5,
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomWidth: 0,
  },
  summaryLabelBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7B1FA2',
  },
  summaryValueBold: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 1.5,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
  },
  // Matricule Check Step Styles
  matriculeCheckContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  matriculeCheckLabel: {
    fontSize: 16,
    color: '#555',
    marginBottom: 15,
    textAlign: 'center',
  },
  matriculeCheckPlate: {
    marginBottom: 10,
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 25,
    marginBottom: 15,
  },
  noButton: {
    flex: 1,
    backgroundColor: '#F44336',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 4,
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  noButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  yesButton: {
    flex: 1.5,
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 4,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  yesButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 10,
    gap: 8,
  },
  backLinkText: {
    color: '#9C27B0',
    fontSize: 16,
    fontWeight: '600',
  },
  displayMatricule: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#9C27B0',
    borderStyle: 'dashed',
  },
  matriculeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  questionContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  questionHelper: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 10,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#D32F2F',
    borderRadius: 12,
    paddingVertical: 15,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 15,
  },
  rejectButtonContent: {
    flexDirection: 'row-reverse',
    height: 50,
  },
  acceptButtonContent: {
    flexDirection: 'row-reverse',
    height: 50,
  },
  rejectButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  acceptButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  errorBoxText: {
    flex: 1,
    color: '#C62828',
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 15,
    borderColor: '#9C27B0',
    borderRadius: 10,
  },
});
