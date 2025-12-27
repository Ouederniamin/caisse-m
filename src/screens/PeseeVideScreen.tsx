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
} from 'react-native';
import {
  Text,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TunisianMatriculeInput from '../components/TunisianMatriculeInput';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Arabic translations
const AR = {
  emptyWeighing: 'الوزن الفارغ',
  newTour: 'جولة جديدة',
  vehicle: 'المركبة',
  enterPlate: 'إدخال الترقيم',
  weighing: 'الوزن',
  emptyWeight: 'الوزن فارغ',
  driver: 'السائق',
  driverInfo: 'المعلومات',
  confirm: 'تأكيد',
  validation: 'التحقق',
  vehiclePlate: 'ترقيم المركبة',
  enterPlateFull: 'أدخل الترقيم لتحديد المركبة',
  searchingDB: 'جاري البحث في قاعدة البيانات...',
  vehicleRecognized: 'مركبة معروفة:',
  newVehicle: 'مركبة جديدة - يجب إدخال معلومات السائق',
  emptyWeighingTitle: 'الوزن الفارغ',
  enterWeightKg: 'أدخل وزن الشاحنة فارغة بالكيلوغرام',
  kg: 'كغ',
  example: 'مثال: 3500، 4200، 5000',
  emptyWeightConfirm: 'الوزن الفارغ:',
  driverInfoTitle: 'معلومات السائق',
  newVehicleEnterInfo: 'هذه مركبة جديدة، يرجى إدخال المعلومات',
  driverFullName: 'الاسم الكامل للسائق *',
  driverNamePlaceholder: 'مثال: محمد بن علي',
  vehicleBrand: 'ماركة المركبة (اختياري)',
  vehicleBrandPlaceholder: 'مثال: مرسيدس، رينو، إيسوزو...',
  confirmTitle: 'تأكيد',
  verifyInfo: 'تحقق من المعلومات قبل إنشاء الجولة',
  plate: 'الترقيم',
  recognizedDriver: 'سائق معروف',
  nextSteps: '📋 الخطوات التالية',
  step2: 'عامل المراقبة يقوم بالتحميل',
  step3: 'الأمن يقوم بوزن الخروج',
  next: 'التالي',
  confirmBtn: 'تأكيد',
  createTour: 'إنشاء الجولة',
  tourCreated: '✅ تم إنشاء الجولة',
  driverCanGo: 'يمكن للسائق التوجه الآن للتحميل.',
  error: 'خطأ',
  pleaseEnterPlate: 'يرجى إدخال ترقيم كامل',
  pleaseEnterWeight: 'يرجى إدخال وزن فارغ صحيح',
  pleaseEnterDriver: 'يرجى إدخال اسم السائق',
  errorCreating: 'خطأ أثناء إنشاء الجولة',
  ok: 'حسنا',
};

// Step definitions - RTL order
const STEPS = [
  { key: 'matricule', title: AR.vehicle, icon: 'car', description: AR.enterPlate },
  { key: 'poids', title: AR.weighing, icon: 'scale', description: AR.emptyWeight },
  { key: 'chauffeur', title: AR.driver, icon: 'account', description: AR.driverInfo },
  { key: 'confirm', title: AR.confirm, icon: 'check-circle', description: AR.validation },
];

export default function PeseeVideScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  
  // Form state
  const [matricule, setMatricule] = useState('');
  const [poidsVide, setPoidsVide] = useState('');
  const [driverName, setDriverName] = useState('');
  const [existingDriver, setExistingDriver] = useState<any>(null);
  const [marqueVehicule, setMarqueVehicule] = useState('');
  
  // UI state
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchingDriver, setSearchingDriver] = useState(false);
  const [driverSearched, setDriverSearched] = useState(false);
  
  // Animation
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Search for existing driver when matricule changes
  useEffect(() => {
    const searchDriver = async () => {
      if (matricule.length >= 8) {
        setSearchingDriver(true);
        setDriverSearched(false);
        try {
          const response = await api.get('/api/drivers/by-matricule', {
            params: { matricule }
          });
          if (response.data.driver) {
            setExistingDriver(response.data.driver);
            setDriverName(response.data.driver.nom_complet);
            setMarqueVehicule(response.data.driver.marque_vehicule || '');
          } else {
            setExistingDriver(null);
            setDriverName('');
            setMarqueVehicule('');
          }
        } catch (error) {
          console.error('Error searching driver:', error);
          setExistingDriver(null);
        } finally {
          setSearchingDriver(false);
          setDriverSearched(true);
        }
      } else {
        setExistingDriver(null);
        setDriverSearched(false);
      }
    };

    const timer = setTimeout(searchDriver, 600);
    return () => clearTimeout(timer);
  }, [matricule]);

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

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0:
        if (matricule.length < 8) {
          showAlert(AR.error, AR.pleaseEnterPlate);
          return false;
        }
        return true;
      case 1:
        if (!poidsVide.trim() || isNaN(parseFloat(poidsVide)) || parseFloat(poidsVide) <= 0) {
          showAlert(AR.error, AR.pleaseEnterWeight);
          return false;
        }
        return true;
      case 2:
        if (!existingDriver && !driverName.trim()) {
          showAlert(AR.error, AR.pleaseEnterDriver);
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
      Alert.alert(title, message, [{ text: AR.ok, onPress: onOk }]);
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep === 1 && existingDriver) {
        animateToStep(3);
      } else {
        animateToStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 0) {
      navigation.goBack();
    } else if (currentStep === 3 && existingDriver) {
      animateToStep(1);
    } else {
      animateToStep(currentStep - 1);
    }
  };

  const handleCreateTour = async () => {
    setLoading(true);
    try {
      const payload: any = {
        matricule_vehicule: matricule,
        poids_a_vide: parseFloat(poidsVide),
        securiteId: user?.id,
      };

      if (existingDriver) {
        payload.driverId = existingDriver.id;
      } else {
        payload.driverName = driverName;
        payload.marque_vehicule = marqueVehicule || null;
      }

      await api.post('/api/tours/pesee-vide', payload);

      showAlert(AR.tourCreated, AR.driverCanGo, () => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      });
    } catch (error: any) {
      console.error('Error creating tour:', error);
      showAlert(AR.error, error.response?.data?.error || AR.errorCreating);
    } finally {
      setLoading(false);
    }
  };

  // Render stepper header - RTL (reversed)
  const renderStepper = () => (
    <View style={styles.stepperContainer}>
      {[...STEPS].reverse().map((step, reverseIndex) => {
        const index = STEPS.length - 1 - reverseIndex;
        const isActive = currentStep === index;
        const isCompleted = currentStep > index;
        const isSkipped = index === 2 && existingDriver && currentStep > 1;
        
        return (
          <React.Fragment key={step.key}>
            {reverseIndex > 0 && (
              <View style={[styles.stepLine, (currentStep > index) && styles.stepLineCompleted]} />
            )}
            <TouchableOpacity
              style={styles.stepItem}
              onPress={() => { if (isCompleted) animateToStep(index); }}
              disabled={!isCompleted}
            >
              <View style={[
                styles.stepCircle,
                isActive && styles.stepCircleActive,
                isCompleted && styles.stepCircleCompleted,
                isSkipped && styles.stepCircleSkipped,
              ]}>
                {isCompleted ? (
                  <MaterialCommunityIcons name="check" size={16} color="#fff" />
                ) : isSkipped ? (
                  <MaterialCommunityIcons name="skip-next" size={14} color="#fff" />
                ) : (
                  <Text style={[styles.stepCircleText, isActive && styles.stepCircleTextActive]}>{index + 1}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, isActive && styles.stepLabelActive, isCompleted && styles.stepLabelCompleted]}>{step.title}</Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );

  // Step 1: Matricule - RTL
  const renderMatriculeStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIconCircle}>
          <MaterialCommunityIcons name="car" size={32} color="#9C27B0" />
        </View>
        <Text style={styles.stepTitle}>{AR.vehiclePlate}</Text>
        <Text style={styles.stepDescription}>{AR.enterPlateFull}</Text>
      </View>

      <View style={styles.inputSection}>
        <TunisianMatriculeInput
          value={matricule}
          onChangeMatricule={(fullMatricule) => setMatricule(fullMatricule)}
          rtl={true}
        />
        
        {searchingDriver && (
          <View style={styles.searchingContainer}>
            <Text style={styles.searchingText}>{AR.searchingDB}</Text>
            <ActivityIndicator size="small" color="#9C27B0" />
          </View>
        )}
        
        {driverSearched && !searchingDriver && (
          <View style={[styles.driverStatus, existingDriver ? styles.driverStatusFound : styles.driverStatusNew]}>
            <Text style={[styles.driverStatusText, existingDriver ? styles.driverStatusTextFound : styles.driverStatusTextNew]}>
              {existingDriver ? `${AR.vehicleRecognized} ${existingDriver.nom_complet}` : AR.newVehicle}
            </Text>
            <MaterialCommunityIcons name={existingDriver ? "account-check" : "account-plus"} size={20} color={existingDriver ? "#4CAF50" : "#FF9800"} />
          </View>
        )}
      </View>
    </View>
  );

  // Step 2: Poids - RTL
  const renderPoidsStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIconCircle}>
          <MaterialCommunityIcons name="scale" size={32} color="#9C27B0" />
        </View>
        <Text style={styles.stepTitle}>{AR.emptyWeighingTitle}</Text>
        <Text style={styles.stepDescription}>{AR.enterWeightKg}</Text>
      </View>

      <View style={styles.inputSection}>
        <View style={styles.weightCard}>
          <View style={styles.weightInputRow}>
            <Text style={styles.weightUnit}>{AR.kg}</Text>
            <RNTextInput
              style={styles.weightInput}
              value={poidsVide}
              onChangeText={setPoidsVide}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor="#ccc"
            />
            <MaterialCommunityIcons name="weight-kilogram" size={28} color="#9C27B0" />
          </View>
          <Text style={styles.weightHint}>{AR.example}</Text>
        </View>

        {poidsVide && parseFloat(poidsVide) > 0 && (
          <View style={styles.weightConfirmation}>
            <Text style={styles.weightConfirmationText}>{AR.emptyWeightConfirm} {parseFloat(poidsVide).toLocaleString()} {AR.kg}</Text>
            <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
          </View>
        )}
      </View>
    </View>
  );

  // Step 3: Chauffeur - RTL
  const renderChauffeurStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIconCircle}>
          <MaterialCommunityIcons name="account" size={32} color="#9C27B0" />
        </View>
        <Text style={styles.stepTitle}>{AR.driverInfoTitle}</Text>
        <Text style={styles.stepDescription}>{AR.newVehicleEnterInfo}</Text>
      </View>

      <View style={styles.inputSection}>
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>{AR.driverFullName}</Text>
          <View style={styles.textInputContainer}>
            <RNTextInput
              style={styles.textInput}
              value={driverName}
              onChangeText={setDriverName}
              placeholder={AR.driverNamePlaceholder}
              placeholderTextColor="#999"
              textAlign="right"
            />
            <MaterialCommunityIcons name="account" size={20} color="#9C27B0" style={styles.inputIcon} />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>{AR.vehicleBrand}</Text>
          <View style={styles.textInputContainer}>
            <RNTextInput
              style={styles.textInput}
              value={marqueVehicule}
              onChangeText={setMarqueVehicule}
              placeholder={AR.vehicleBrandPlaceholder}
              placeholderTextColor="#999"
              textAlign="right"
            />
            <MaterialCommunityIcons name="truck" size={20} color="#9C27B0" style={styles.inputIcon} />
          </View>
        </View>
      </View>
    </View>
  );

  // Step 4: Confirmation - RTL
  const renderConfirmStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepIconCircle, { backgroundColor: '#E8F5E9' }]}>
          <MaterialCommunityIcons name="check-circle" size={32} color="#4CAF50" />
        </View>
        <Text style={styles.stepTitle}>{AR.confirmTitle}</Text>
        <Text style={styles.stepDescription}>{AR.verifyInfo}</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>{AR.plate}</Text>
            <Text style={styles.summaryValue}>{matricule}</Text>
          </View>
          <View style={styles.summaryIcon}>
            <MaterialCommunityIcons name="car" size={20} color="#9C27B0" />
          </View>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>{AR.emptyWeight}</Text>
            <Text style={styles.summaryValue}>{parseFloat(poidsVide).toLocaleString()} {AR.kg}</Text>
          </View>
          <View style={styles.summaryIcon}>
            <MaterialCommunityIcons name="scale" size={20} color="#9C27B0" />
          </View>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>{AR.driver}</Text>
            <Text style={styles.summaryValue}>{existingDriver ? existingDriver.nom_complet : driverName}</Text>
            {existingDriver && <Text style={styles.summarySubValue}>{AR.recognizedDriver}</Text>}
          </View>
          <View style={styles.summaryIcon}>
            <MaterialCommunityIcons name={existingDriver ? "account-check" : "account"} size={20} color={existingDriver ? "#4CAF50" : "#9C27B0"} />
          </View>
        </View>

        {(marqueVehicule || existingDriver?.marque_vehicule) && (
          <>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryLabel}>{AR.vehicle}</Text>
                <Text style={styles.summaryValue}>{marqueVehicule || existingDriver?.marque_vehicule}</Text>
              </View>
              <View style={styles.summaryIcon}>
                <MaterialCommunityIcons name="truck" size={20} color="#9C27B0" />
              </View>
            </View>
          </>
        )}
      </View>

      <View style={styles.nextStepsCard}>
        <Text style={styles.nextStepsTitle}>{AR.nextSteps}</Text>
        <View style={styles.nextStep}>
          <Text style={styles.nextStepText}>{AR.step2}</Text>
          <View style={styles.nextStepBadge}><Text style={styles.nextStepNumber}>2</Text></View>
        </View>
        <View style={styles.nextStep}>
          <Text style={styles.nextStepText}>{AR.step3}</Text>
          <View style={styles.nextStepBadge}><Text style={styles.nextStepNumber}>3</Text></View>
        </View>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderMatriculeStep();
      case 1: return renderPoidsStep();
      case 2: return renderChauffeurStep();
      case 3: return renderConfirmStep();
      default: return null;
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header - RTL */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{AR.emptyWeighing}</Text>
          <Text style={styles.headerSubtitle}>{AR.newTour}</Text>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {renderStepper()}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ opacity: fadeAnim }}>{renderCurrentStep()}</Animated.View>
      </ScrollView>

      <View style={styles.bottomButtons}>
        {currentStep < 3 ? (
          <Button mode="contained" onPress={handleNext} style={styles.nextButton} labelStyle={styles.nextButtonLabel} icon="arrow-left" contentStyle={styles.nextButtonContent}>
            {currentStep === 1 && existingDriver ? AR.confirmBtn : AR.next}
          </Button>
        ) : (
          <Button mode="contained" onPress={handleCreateTour} loading={loading} disabled={loading} style={styles.submitButton} labelStyle={styles.submitButtonLabel} icon="check-circle">
            {AR.createTour}
          </Button>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { backgroundColor: '#9C27B0', paddingTop: Platform.OS === 'ios' ? 55 : 45, paddingBottom: 18, paddingHorizontal: 16, flexDirection: 'row-reverse', alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  headerTextContainer: { flex: 1, alignItems: 'flex-end' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  stepItem: { alignItems: 'center' },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  stepCircleActive: { backgroundColor: '#9C27B0' },
  stepCircleCompleted: { backgroundColor: '#4CAF50' },
  stepCircleSkipped: { backgroundColor: '#FF9800' },
  stepCircleText: { color: '#999', fontSize: 14, fontWeight: 'bold' },
  stepCircleTextActive: { color: '#fff' },
  stepLabel: { fontSize: 11, color: '#999', fontWeight: '500', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  stepLabelActive: { color: '#9C27B0', fontWeight: '700' },
  stepLabelCompleted: { color: '#4CAF50' },
  stepLine: { width: 30, height: 2, backgroundColor: '#e0e0e0', marginHorizontal: 6, marginBottom: 20 },
  stepLineCompleted: { backgroundColor: '#4CAF50' },
  content: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 100 },
  stepContent: { flex: 1 },
  stepHeader: { alignItems: 'center', marginBottom: 30 },
  stepIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#F3E5F5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  stepTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 8, fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif', textAlign: 'center' },
  stepDescription: { fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 20, fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  inputSection: { flex: 1 },
  searchingContainer: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 10 },
  searchingText: { fontSize: 14, color: '#9C27B0', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  driverStatus: { flexDirection: 'row-reverse', alignItems: 'center', padding: 14, borderRadius: 10, marginTop: 16 },
  driverStatusFound: { backgroundColor: '#E8F5E9' },
  driverStatusNew: { backgroundColor: '#FFF3E0' },
  driverStatusText: { marginRight: 10, fontSize: 14, flex: 1, textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  driverStatusTextFound: { color: '#2E7D32' },
  driverStatusTextNew: { color: '#E65100' },
  weightCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  weightInputRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center' },
  weightInput: { fontSize: 48, fontWeight: 'bold', color: '#333', textAlign: 'center', minWidth: 150, padding: 0, marginHorizontal: 10 },
  weightUnit: { fontSize: 24, color: '#666', fontWeight: '600' },
  weightHint: { marginTop: 12, fontSize: 13, color: '#999', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  weightConfirmation: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', marginTop: 20, padding: 14, backgroundColor: '#E8F5E9', borderRadius: 10 },
  weightConfirmationText: { marginRight: 10, fontSize: 16, fontWeight: '600', color: '#2E7D32', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  formGroup: { marginBottom: 20 },
  formLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 10, textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  textInputContainer: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#e0e0e0' },
  inputIcon: { marginLeft: 10 },
  textInput: { flex: 1, fontSize: 16, color: '#333', paddingVertical: 14, fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  summaryRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 12 },
  summaryIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3E5F5', justifyContent: 'center', alignItems: 'center', marginLeft: 14 },
  summaryInfo: { flex: 1, alignItems: 'flex-end' },
  summaryLabel: { fontSize: 12, color: '#999', marginBottom: 2, fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  summaryValue: { fontSize: 16, fontWeight: '600', color: '#333', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  summarySubValue: { fontSize: 12, color: '#4CAF50', marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  summaryDivider: { height: 1, backgroundColor: '#f0f0f0' },
  nextStepsCard: { backgroundColor: '#F3E5F5', borderRadius: 12, padding: 16, marginTop: 20 },
  nextStepsTitle: { fontSize: 14, fontWeight: '600', color: '#7B1FA2', marginBottom: 12, textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  nextStep: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10 },
  nextStepBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#9C27B0', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  nextStepNumber: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  nextStepText: { fontSize: 13, color: '#666', flex: 1, textAlign: 'right', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  bottomButtons: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: Platform.OS === 'ios' ? 30 : 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  nextButton: { backgroundColor: '#9C27B0', borderRadius: 12, paddingVertical: 6 },
  nextButtonLabel: { fontSize: 16, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
  nextButtonContent: { flexDirection: 'row' },
  submitButton: { backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 6 },
  submitButtonLabel: { fontSize: 16, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' },
});
