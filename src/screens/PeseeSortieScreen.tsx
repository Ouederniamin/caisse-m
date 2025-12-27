import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
  Alert,
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

// Arabic translations
const AR = {
  exitWeighing: 'وزن الخروج',
  loading: 'جاري التحميل...',
  info: 'المعلومات',
  plate: 'الترقيم',
  weighing: 'الوزن',
  confirm: 'تأكيد',
  tourInfo: 'معلومات الجولة',
  driver: 'السائق',
  notAssigned: 'غير معين',
  vehiclePlate: 'ترقيم المركبة',
  sector: 'القطاع',
  crates: 'الصناديق',
  cratesUnit: 'صندوق',
  continue: 'متابعة',
  plateVerification: 'التحقق من الترقيم',
  verifyPlateMatch: 'تأكد من تطابق ترقيم المركبة مع الترقيم المعروض',
  isThisPlate: 'هل تحمل المركبة هذا الترقيم؟',
  no: 'لا',
  yesCorrect: 'نعم، صحيح',
  plateNoMatch: 'الترقيم غير مطابق. يرجى التحقق من المركبة.',
  back: 'رجوع',
  vehicleWeighing: 'وزن المركبة',
  plateVerified: 'تم التحقق من الترقيم',
  grossWeight: 'الوزن الإجمالي (كغ):',
  kg: 'كغ',
  confirmation: 'التأكيد',
  verifyBeforeConfirm: 'تحقق من المعلومات قبل تأكيد وزن الخروج',
  grossWeightLabel: 'الوزن الإجمالي',
  confirmBtn: 'تأكيد',
  exitWeighingRecorded: '✅ تم تسجيل وزن الخروج',
  vehicleCanLeave: 'يمكن للمركبة الآن الانطلاق في الجولة.',
  error: 'خطأ',
  cannotLoadTour: 'تعذر تحميل تفاصيل الجولة',
  pleaseEnterWeight: 'يرجى إدخال وزن صحيح',
  cannotRecord: 'تعذر تسجيل الوزن',
  ok: 'حسنا',
  na: 'غ/م',
};

const STEPS = [
  { key: 'info', title: AR.info, icon: 'information' },
  { key: 'matricule', title: AR.plate, icon: 'car' },
  { key: 'pesee', title: AR.weighing, icon: 'scale' },
  { key: 'confirm', title: AR.confirm, icon: 'check-circle' },
];

interface PeseeSortieScreenProps {
  route: any;
  navigation: any;
}

export default function PeseeSortieScreen({ route, navigation }: PeseeSortieScreenProps) {
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
      showAlert(AR.error, AR.cannotLoadTour);
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
      Alert.alert(title, message, [{ text: AR.ok, onPress: onOk }]);
    }
  };

  const handleSubmitPesee = async () => {
    if (!poidsInput || parseFloat(poidsInput) <= 0) {
      showAlert(AR.error, AR.pleaseEnterWeight);
      return;
    }
    setCurrentStep(3);
  };

  const handleFinalConfirm = async () => {
    setSubmitting(true);
    try {
      await api.patch(`/api/tours/${tourId}/sortie`, {
        poids_brut_securite_sortie: parseFloat(poidsInput),
        matricule_vehicule: tour.matricule_vehicule,
      });

      showAlert(
        AR.exitWeighingRecorded,
        `${AR.vehicleCanLeave}\n\n${AR.grossWeightLabel}: ${poidsInput} ${AR.kg}`,
        () => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        }
      );
    } catch (error: any) {
      showAlert(AR.error, error.response?.data?.error || AR.cannotRecord);
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
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>{AR.loading}</Text>
      </View>
    );
  }

  // Stepper - RTL (reversed)
  const renderStepper = () => (
    <View style={styles.stepperContainer}>
      {[...STEPS].reverse().map((step, reverseIndex) => {
        const index = STEPS.length - 1 - reverseIndex;
        const isActive = currentStep === index;
        const isCompleted = currentStep > index;
        const isClickable = index < currentStep;

        return (
          <React.Fragment key={step.key}>
            {reverseIndex > 0 && (
              <View style={[styles.stepLine, (currentStep > index) && styles.stepLineCompleted]} />
            )}
            <TouchableOpacity
              style={styles.stepItem}
              onPress={() => isClickable && goToStep(index)}
              disabled={!isClickable}
            >
              <View style={[styles.stepCircle, isActive && styles.stepCircleActive, isCompleted && styles.stepCircleCompleted]}>
                {isCompleted ? (
                  <MaterialCommunityIcons name="check" size={18} color="#fff" />
                ) : (
                  <MaterialCommunityIcons name={step.icon as any} size={18} color={isActive ? '#fff' : '#9E9E9E'} />
                )}
              </View>
              <Text style={[styles.stepLabel, isActive && styles.stepLabelActive, isCompleted && styles.stepLabelCompleted]}>{step.title}</Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );

  const renderInfoStep = () => (
    <Card style={styles.stepCard}>
      <Card.Content>
        <View style={styles.stepHeader}>
          <Title style={styles.stepTitle}>{AR.tourInfo}</Title>
          <MaterialCommunityIcons name="truck" size={28} color="#2196F3" />
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{AR.driver}</Text>
              <Text style={styles.infoValue}>{tour.driver?.nom_complet || AR.notAssigned}</Text>
            </View>
            <MaterialCommunityIcons name="account" size={22} color="#666" />
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{AR.vehiclePlate}</Text>
              <View style={styles.matriculeDisplay}>
                <MatriculeText matricule={tour.matricule_vehicule} size="small" />
              </View>
            </View>
            <MaterialCommunityIcons name="car" size={22} color="#666" />
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{AR.sector}</Text>
              <Text style={styles.infoValue}>{tour.secteur?.nom || AR.na}</Text>
            </View>
            <MaterialCommunityIcons name="map-marker" size={22} color="#666" />
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{AR.crates}</Text>
              <Text style={styles.infoValue}>{tour.nbre_caisses_depart || tour.nombre_caisses_livrees || 0} {AR.cratesUnit}</Text>
            </View>
            <MaterialCommunityIcons name="package-variant" size={22} color="#666" />
          </View>
        </View>

        <Button mode="contained" onPress={() => setCurrentStep(1)} style={styles.nextButton} icon="arrow-left" contentStyle={styles.nextButtonContent}>
          {AR.continue}
        </Button>
      </Card.Content>
    </Card>
  );

  const renderMatriculeStep = () => (
    <Card style={styles.stepCard}>
      <Card.Content>
        <View style={styles.stepHeader}>
          <Title style={styles.stepTitle}>{AR.plateVerification}</Title>
          <MaterialCommunityIcons name="car-side" size={28} color="#2196F3" />
        </View>

        <Text style={styles.stepDescription}>{AR.verifyPlateMatch}</Text>

        <View style={styles.matriculeCheckContainer}>
          <Text style={styles.matriculeCheckLabel}>{AR.isThisPlate}</Text>
          <View style={styles.matriculeCheckPlate}>
            <MatriculeText matricule={tour.matricule_vehicule} size="large" />
          </View>
        </View>

        {matriculeError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{matriculeError}</Text>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#D32F2F" />
          </View>
        ) : null}

        <View style={styles.confirmButtonsRow}>
          <TouchableOpacity
            style={styles.yesButton}
            onPress={() => { setMatriculeError(''); setMatriculeVerified(true); setCurrentStep(2); }}
            activeOpacity={0.8}
          >
            <Text style={styles.yesButtonText}>{AR.yesCorrect}</Text>
            <MaterialCommunityIcons name="check-circle" size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.noButton}
            onPress={() => { setMatriculeError(AR.plateNoMatch); setMatriculeVerified(false); }}
            activeOpacity={0.8}
          >
            <Text style={styles.noButtonText}>{AR.no}</Text>
            <MaterialCommunityIcons name="close-circle" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.backLinkContainer} onPress={() => setCurrentStep(0)} activeOpacity={0.7}>
          <Text style={styles.backLinkText}>{AR.back}</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#2196F3" />
        </TouchableOpacity>
      </Card.Content>
    </Card>
  );

  const renderPeseeStep = () => (
    <Card style={styles.stepCard}>
      <Card.Content>
        <View style={styles.stepHeader}>
          <Title style={styles.stepTitle}>{AR.vehicleWeighing}</Title>
          <MaterialCommunityIcons name="scale" size={28} color="#FF9800" />
        </View>

        <View style={styles.verifiedBadge}>
          <MatriculeText matricule={tour.matricule_vehicule} size="small" />
          <Text style={styles.verifiedText}>{AR.plateVerified}</Text>
          <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
        </View>

        <Text style={styles.inputLabel}>{AR.grossWeight}</Text>
        <View style={styles.weightInputContainer}>
          <Text style={styles.weightUnit}>{AR.kg}</Text>
          <TextInput
            value={poidsInput}
            onChangeText={setPoidsInput}
            mode="outlined"
            keyboardType="numeric"
            placeholder="0.00"
            style={styles.weightInput}
            outlineColor="#FF9800"
            activeOutlineColor="#FF9800"
          />
          <MaterialCommunityIcons name="scale" size={24} color="#FF9800" />
        </View>

        <View style={styles.buttonRow}>
          <Button mode="contained" onPress={handleSubmitPesee} style={[styles.nextButton, { backgroundColor: '#FF9800' }]} icon="arrow-left" disabled={!poidsInput || parseFloat(poidsInput) <= 0}>
            {AR.continue}
          </Button>
          <Button mode="outlined" onPress={() => setCurrentStep(1)} style={styles.backButton} icon="arrow-right">
            {AR.back}
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  const renderConfirmStep = () => (
    <Card style={styles.stepCard}>
      <Card.Content>
        <View style={styles.stepHeader}>
          <Title style={styles.stepTitle}>{AR.confirmation}</Title>
          <MaterialCommunityIcons name="check-circle-outline" size={28} color="#4CAF50" />
        </View>

        <Text style={styles.stepDescription}>{AR.verifyBeforeConfirm}</Text>

        <View style={styles.confirmSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{tour.driver?.nom_complet || AR.notAssigned}</Text>
            <Text style={styles.summaryLabel}>{AR.driver}</Text>
          </View>

          <View style={styles.summaryRow}>
            <MatriculeText matricule={tour.matricule_vehicule} size="small" />
            <Text style={styles.summaryLabel}>{AR.vehiclePlate}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{tour.secteur?.nom || AR.na}</Text>
            <Text style={styles.summaryLabel}>{AR.sector}</Text>
          </View>

          <View style={[styles.summaryRow, styles.summaryHighlight]}>
            <Text style={styles.summaryValueBold}>{poidsInput} {AR.kg}</Text>
            <Text style={styles.summaryLabelBold}>{AR.grossWeightLabel}</Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <Button mode="contained" onPress={handleFinalConfirm} style={styles.confirmButton} icon="check" loading={submitting} disabled={submitting}>
            {AR.confirmBtn}
          </Button>
          <Button mode="outlined" onPress={() => setCurrentStep(2)} style={styles.backButton} icon="arrow-right" disabled={submitting}>
            {AR.back}
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderInfoStep();
      case 1: return renderMatriculeStep();
      case 2: return renderPeseeStep();
      case 3: return renderConfirmStep();
      default: return null;
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header - RTL */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Title style={styles.headerTitle}>{AR.exitWeighing}</Title>
          <MaterialCommunityIcons name="scale" size={32} color="#fff" />
        </View>
        <TouchableOpacity style={styles.backButtonHeader} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{AR.back}</Text>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {renderStepper()}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {renderCurrentStep()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 12, color: '#666', fontSize: 16, fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  header: { backgroundColor: '#2196F3', paddingTop: Platform.OS === 'ios' ? 50 : 40, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 6 },
  backButtonHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10 },
  backButtonText: { color: '#fff', fontSize: 16, marginRight: 5, fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  headerTitleContainer: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10 },
  headerTitle: { color: '#fff', fontSize: 26, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, paddingHorizontal: 15, backgroundColor: '#fff', marginHorizontal: 15, marginTop: -15, borderRadius: 15, elevation: 3 },
  stepItem: { alignItems: 'center' },
  stepCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  stepCircleActive: { backgroundColor: '#2196F3' },
  stepCircleCompleted: { backgroundColor: '#4CAF50' },
  stepLabel: { fontSize: 10, color: '#9E9E9E', fontWeight: '500', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  stepLabelActive: { color: '#2196F3', fontWeight: 'bold' },
  stepLabelCompleted: { color: '#4CAF50', fontWeight: '600' },
  stepLine: { width: 30, height: 2, backgroundColor: '#E0E0E0', marginHorizontal: 5, marginBottom: 20 },
  stepLineCompleted: { backgroundColor: '#4CAF50' },
  content: { flex: 1, padding: 15 },
  contentContainer: { paddingBottom: 30 },
  stepCard: { borderRadius: 15, elevation: 3 },
  stepHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  stepTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  stepDescription: { fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 20, textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  infoGrid: { gap: 15, marginBottom: 20 },
  infoItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: '#FAFAFA', padding: 12, borderRadius: 10 },
  infoContent: { flex: 1, alignItems: 'flex-end' },
  infoLabel: { fontSize: 12, color: '#666', marginBottom: 2, fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#333', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  matriculeDisplay: { marginTop: 4 },
  nextButton: { backgroundColor: '#2196F3', borderRadius: 10, marginTop: 10 },
  nextButtonContent: { flexDirection: 'row' },
  matriculeCheckContainer: { alignItems: 'center', marginVertical: 20 },
  matriculeCheckLabel: { fontSize: 16, color: '#555', marginBottom: 15, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  matriculeCheckPlate: { marginBottom: 10 },
  errorContainer: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: '#FFEBEE', padding: 12, borderRadius: 8, marginBottom: 15 },
  errorText: { color: '#D32F2F', fontSize: 14, flex: 1, textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  confirmButtonsRow: { flexDirection: 'row-reverse', gap: 15, marginTop: 25, marginBottom: 15 },
  noButton: { flex: 1, backgroundColor: '#F44336', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 20, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 4 },
  noButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  yesButton: { flex: 1.5, backgroundColor: '#4CAF50', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 20, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 4 },
  yesButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  backLinkContainer: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', marginTop: 20, paddingVertical: 10, gap: 8 },
  backLinkText: { color: '#2196F3', fontSize: 16, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  verifiedBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: '#E8F5E9', padding: 12, borderRadius: 10, marginBottom: 20, flexWrap: 'wrap' },
  verifiedText: { color: '#2E7D32', fontSize: 14, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 10, textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  weightInputContainer: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 15 },
  weightInput: { flex: 1, backgroundColor: '#fff', fontSize: 20 },
  weightUnit: { fontSize: 18, fontWeight: 'bold', color: '#666' },
  buttonRow: { flexDirection: 'row-reverse', gap: 10, marginTop: 10 },
  backButton: { flex: 1, borderRadius: 10 },
  confirmSummary: { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 15, marginBottom: 20, gap: 12 },
  summaryRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  summaryLabel: { fontSize: 14, color: '#666', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#333', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  summaryHighlight: { backgroundColor: '#FFF3E0', marginHorizontal: -15, marginBottom: -15, marginTop: 5, paddingHorizontal: 15, paddingVertical: 15, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderBottomWidth: 0 },
  summaryLabelBold: { fontSize: 16, fontWeight: 'bold', color: '#E65100', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  summaryValueBold: { fontSize: 20, fontWeight: 'bold', color: '#FF9800' },
  confirmButton: { flex: 1.5, backgroundColor: '#4CAF50', borderRadius: 10 },
});
