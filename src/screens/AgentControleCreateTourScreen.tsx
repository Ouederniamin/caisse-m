import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, TouchableOpacity, Dimensions, Image, Modal, FlatList, Platform } from 'react-native';
import { Text, TextInput, Button, Title, Card, Searchbar, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STEPS = [
  { id: 1, title: 'Matricule & Secteur', icon: 'car' },
  { id: 2, title: 'Détails départ', icon: 'package-variant' },
];

export default function AgentControleCreateTourScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Data
  const [drivers, setDrivers] = useState<any[]>([]);
  const [secteurs, setSecteurs] = useState<any[]>([]);

  // Form
  const [selectedSecteur, setSelectedSecteur] = useState<any>(null);
  const [serieNumber, setSerieNumber] = useState('253');
  const [uniqueNumber, setUniqueNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [carBrand, setCarBrand] = useState('');
  const [existingDriver, setExistingDriver] = useState<any>(null);
  const [matriculeExists, setMatriculeExists] = useState(false);
  const [caissesDepart, setCaissesDepart] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // UI State
  const [showSecteurModal, setShowSecteurModal] = useState(false);
  const [secteurSearch, setSecteurSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [driversRes, secteursRes] = await Promise.all([
        api.get('/api/drivers'),
        api.get('/api/secteurs'),
      ]);
      setDrivers(driversRes.data || []);
      setSecteurs(secteursRes.data || []);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les données');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 = serieNumber.length === 3 && uniqueNumber.length === 4 && selectedSecteur && 
    (matriculeExists || (driverName.trim() && carBrand.trim()));
  const canSubmit = canProceedStep1 && caissesDepart && photoUrl;

  const handleNextStep = () => {
    if (currentStep === 1 && !canProceedStep1) {
      Alert.alert('Attention', 'Veuillez saisir un matricule valide et sélectionner un secteur');
      return;
    }
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs et prendre une photo');
      return;
    }

    setSubmitting(true);
    try {
      const fullMatricule = `${serieNumber} تونس ${uniqueNumber}`;
      
      // Convert photo to base64
      let photo_base64 = null;
      if (photoUrl) {
        if (Platform.OS === 'web') {
          // On web, fetch the blob and convert to base64
          const response = await fetch(photoUrl);
          const blob = await response.blob();
          photo_base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else {
          // On native, use FileSystem legacy API
          const base64 = await FileSystem.readAsStringAsync(photoUrl, {
            encoding: FileSystem.EncodingType.Base64,
          });
          photo_base64 = `data:image/jpeg;base64,${base64}`;
        }
      }
      
      await api.post('/api/tours/create', {
        secteurId: selectedSecteur.id,
        agentControleId: user?.id,
        matricule_vehicule: fullMatricule,
        nbre_caisses_depart: parseInt(caissesDepart),
        poids_net_produits_depart: 0,
        photo_base64,
        // Driver info
        driverId: existingDriver?.id || null,
        driverName: !matriculeExists ? driverName.trim() : null,
        marque_vehicule: !matriculeExists ? carBrand.trim() : null,
      });

      console.log('✅ Tour created successfully');
      
      // Navigate back immediately on success
      navigation.goBack();
      
      // Show success alert after navigation (non-blocking)
      setTimeout(() => {
        Alert.alert('Succès', 'Tournée créée avec succès');
      }, 300);
    } catch (error: any) {
      console.error('❌ Tour creation error:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert('Erreur', error.response?.data?.error || 'Impossible de créer la tournée');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSerieChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 3);
    setSerieNumber(cleaned);
    // Reset driver info when serie changes
    if (cleaned.length === 3 && uniqueNumber.length === 4) {
      checkMatricule(cleaned, uniqueNumber);
    } else {
      setExistingDriver(null);
      setMatriculeExists(false);
    }
  };

  const handleUniqueChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
    setUniqueNumber(cleaned);
    // Check matricule when complete
    if (serieNumber.length === 3 && cleaned.length === 4) {
      checkMatricule(serieNumber, cleaned);
    } else {
      setExistingDriver(null);
      setMatriculeExists(false);
    }
  };

  const checkMatricule = async (serie: string, unique: string) => {
    try {
      const fullMatricule = `${serie} تونس ${unique}`;
      const response = await api.get(`/api/drivers/by-matricule?matricule=${encodeURIComponent(fullMatricule)}`);
      
      if (response.data && response.data.driver) {
        // Driver exists for this matricule
        setExistingDriver(response.data.driver);
        setMatriculeExists(true);
        setDriverName(response.data.driver.nom_complet || '');
        setCarBrand(response.data.driver.marque_vehicule || '');
      } else {
        // New matricule - need to create driver
        setExistingDriver(null);
        setMatriculeExists(false);
        setDriverName('');
        setCarBrand('');
      }
    } catch (error) {
      console.log('Matricule not found, new driver needed');
      setExistingDriver(null);
      setMatriculeExists(false);
      setDriverName('');
      setCarBrand('');
    }
  };

  const filteredSecteurs = secteurs.filter((s) =>
    s.nom.toLowerCase().includes(secteurSearch.toLowerCase())
  );

  const takeDepartPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission refusée', 'Autorisez l\'accès à la caméra.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUrl(result.assets[0].uri);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepperContainer}>
      {STEPS.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        return (
          <React.Fragment key={step.id}>
            <TouchableOpacity
              style={[
                styles.stepCircle,
                isActive && styles.stepCircleActive,
                isCompleted && styles.stepCircleCompleted,
              ]}
              onPress={() => {
                if (isCompleted || step.id <= currentStep) {
                  setCurrentStep(step.id);
                }
              }}
              activeOpacity={0.8}
            >
              {isCompleted ? (
                <MaterialCommunityIcons name="check" size={20} color="#fff" />
              ) : (
                <MaterialCommunityIcons
                  name={step.icon as any}
                  size={20}
                  color={isActive ? '#fff' : '#9CA3AF'}
                />
              )}
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

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Matricule du véhicule</Text>
      <Text style={styles.stepSubtitle}>Format plaque tunisienne</Text>

      <View style={styles.plateWrapper}>
        <View style={styles.plateOuter}>
          <View style={styles.plateInner}>
            <View style={styles.plateInputBox}>
              <TextInput
                value={serieNumber}
                onChangeText={handleSerieChange}
                keyboardType="numeric"
                maxLength={3}
                style={styles.plateInput}
                placeholder="000"
                placeholderTextColor="rgba(255,255,255,0.4)"
                textAlign="center"
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                textColor="#fff"
              />
              <Text style={styles.plateInputHint}>Série</Text>
            </View>

            <View style={styles.plateArabicBox}>
              <Text style={styles.plateArabicText}>تونس</Text>
            </View>

            <View style={styles.plateInputBox}>
              <TextInput
                value={uniqueNumber}
                onChangeText={handleUniqueChange}
                keyboardType="numeric"
                maxLength={4}
                style={styles.plateInput}
                placeholder="0000"
                placeholderTextColor="rgba(255,255,255,0.4)"
                textAlign="center"
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                textColor="#fff"
              />
              <Text style={styles.plateInputHint}>Numéro</Text>
            </View>
          </View>
        </View>
      </View>

      {serieNumber.length === 3 && uniqueNumber.length === 4 && (
        <View style={styles.matriculePreview}>
          <MaterialCommunityIcons name="check-decagram" size={22} color="#10B981" />
          <View style={styles.matriculePreviewPlate}>
            <Text style={styles.matriculePreviewNumber}>{serieNumber}</Text>
            <Text style={styles.matriculePreviewArabic}>تونس</Text>
            <Text style={styles.matriculePreviewNumber}>{uniqueNumber}</Text>
          </View>
        </View>
      )}

      {/* Secteur Selector */}
      <Card style={[styles.selectionCard, { marginTop: 24 }]}>
        <Card.Content>
          <Text style={styles.fieldLabel}>
            <MaterialCommunityIcons name="map-marker-radius" size={18} color="#1D4ED8" /> Secteur
          </Text>
          <TouchableOpacity
            style={[styles.selector, selectedSecteur && styles.selectorSelected]}
            onPress={() => setShowSecteurModal(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.selectorText, selectedSecteur && styles.selectorTextSelected]}>
              {selectedSecteur ? selectedSecteur.nom : 'Rechercher un secteur...'}
            </Text>
            <MaterialCommunityIcons name="magnify" size={24} color={selectedSecteur ? '#1D4ED8' : '#9CA3AF'} />
          </TouchableOpacity>
        </Card.Content>
      </Card>

      {/* Driver Info Section - Show when matricule is complete */}
      {serieNumber.length === 3 && uniqueNumber.length === 4 && (
        <Card style={[styles.selectionCard, { marginTop: 16 }]}>
          <Card.Content>
            {matriculeExists && existingDriver ? (
              // Existing driver - show info
              <View>
                <View style={styles.driverFoundHeader}>
                  <MaterialCommunityIcons name="account-check" size={24} color="#10B981" />
                  <Text style={styles.driverFoundTitle}>Chauffeur trouvé</Text>
                </View>
                <View style={styles.driverInfoBox}>
                  <View style={styles.driverInfoRow}>
                    <MaterialCommunityIcons name="account" size={20} color="#1D4ED8" />
                    <Text style={styles.driverInfoLabel}>Nom:</Text>
                    <Text style={styles.driverInfoValue}>{existingDriver.nom_complet}</Text>
                  </View>
                  {existingDriver.marque_vehicule && (
                    <View style={styles.driverInfoRow}>
                      <MaterialCommunityIcons name="car" size={20} color="#1D4ED8" />
                      <Text style={styles.driverInfoLabel}>Véhicule:</Text>
                      <Text style={styles.driverInfoValue}>{existingDriver.marque_vehicule}</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              // New driver - input fields
              <View>
                <View style={styles.driverNewHeader}>
                  <MaterialCommunityIcons name="account-plus" size={24} color="#F59E0B" />
                  <Text style={styles.driverNewTitle}>Nouveau chauffeur</Text>
                </View>
                <Text style={styles.driverNewSubtitle}>Ce matricule n'existe pas encore. Veuillez saisir les informations du chauffeur.</Text>
                
                <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                  <MaterialCommunityIcons name="account" size={18} color="#1D4ED8" /> Nom du chauffeur *
                </Text>
                <TextInput
                  value={driverName}
                  onChangeText={setDriverName}
                  mode="outlined"
                  style={styles.driverInput}
                  placeholder="Ex: Mohamed Ben Ali"
                  outlineColor="#E5E7EB"
                  activeOutlineColor="#1D4ED8"
                />

                <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
                  <MaterialCommunityIcons name="car" size={18} color="#1D4ED8" /> Marque du véhicule *
                </Text>
                <TextInput
                  value={carBrand}
                  onChangeText={setCarBrand}
                  mode="outlined"
                  style={styles.driverInput}
                  placeholder="Ex: Isuzu, Hyundai, Mercedes..."
                  outlineColor="#E5E7EB"
                  activeOutlineColor="#1D4ED8"
                />
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {canProceedStep1 && (
        <View style={styles.selectionSummary}>
          <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />
          <View style={styles.summaryPlate}>
            <Text style={styles.summaryNumber}>{serieNumber}</Text>
            <Text style={styles.summaryArabic}>تونس</Text>
            <Text style={styles.summaryNumber}>{uniqueNumber}</Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={18} color="#6B7280" />
          <Text style={styles.summaryText}>{selectedSecteur.nom}</Text>
        </View>
      )}

      {/* Secteur Search Modal */}
      <Modal visible={showSecteurModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un secteur</Text>
              <IconButton icon="close" size={24} onPress={() => setShowSecteurModal(false)} />
            </View>
            <Searchbar
              placeholder="Rechercher..."
              value={secteurSearch}
              onChangeText={setSecteurSearch}
              style={styles.searchBar}
              inputStyle={styles.searchInput}
            />
            <FlatList
              data={filteredSecteurs}
              keyExtractor={(item) => item.id.toString()}
              style={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedSecteur(item);
                    setShowSecteurModal(false);
                    setSecteurSearch('');
                  }}
                >
                  <MaterialCommunityIcons name="map-marker" size={28} color="#1D4ED8" />
                  <Text style={styles.modalItemText}>{item.nom}</Text>
                  {selectedSecteur?.id === item.id && (
                    <MaterialCommunityIcons name="check-circle" size={22} color="#10B981" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyListText}>Aucun secteur trouvé</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Détails de départ</Text>

      <Card style={styles.detailCard}>
        <Card.Content>
          <Text style={styles.fieldLabel}>
            <MaterialCommunityIcons name="package-variant" size={18} color="#1D4ED8" /> Nombre de caisses
          </Text>
          <TextInput
            value={caissesDepart}
            onChangeText={setCaissesDepart}
            keyboardType="numeric"
            mode="outlined"
            style={styles.caissesInput}
            placeholder="Ex: 50"
            outlineColor="#E5E7EB"
            activeOutlineColor="#1D4ED8"
            left={<TextInput.Icon icon="package-variant-closed" />}
          />
        </Card.Content>
      </Card>

      <Card style={styles.detailCard}>
        <Card.Content>
          <Text style={styles.fieldLabel}>
            <MaterialCommunityIcons name="camera" size={18} color="#1D4ED8" /> Photo preuve départ <Text style={{ color: '#EF4444' }}>*</Text>
          </Text>
          {photoUrl ? (
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: photoUrl }} style={styles.photoPreview} />
              <View style={styles.photoPreviewOverlay}>
                <TouchableOpacity style={styles.photoOverlayBtn} onPress={takeDepartPhoto}>
                  <MaterialCommunityIcons name="camera-retake" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.photoOverlayBtn, { backgroundColor: '#EF4444' }]} onPress={() => setPhotoUrl(null)}>
                  <MaterialCommunityIcons name="delete" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.photoSuccessBadge}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#fff" />
                <Text style={styles.photoSuccessText}>Photo capturée</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.photoCaptureBtn} onPress={takeDepartPhoto} activeOpacity={0.8}>
              <View style={styles.photoCaptureIcon}>
                <MaterialCommunityIcons name="camera" size={40} color="#1D4ED8" />
              </View>
              <Text style={styles.photoCaptureTitle}>Prendre une photo</Text>
              <Text style={styles.photoCaptureHint}>Appuyez pour ouvrir la caméra</Text>
            </TouchableOpacity>
          )}
        </Card.Content>
      </Card>

      {caissesDepart && photoUrl && (
        <View style={styles.readySummary}>
          <MaterialCommunityIcons name="rocket-launch" size={24} color="#1D4ED8" />
          <Text style={styles.readyText}>Prêt à créer la tournée!</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Title style={styles.headerTitle}>Nouvelle Tournée</Title>
          <Text style={styles.headerStep}>
            Étape {currentStep} sur {STEPS.length}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Stepper */}
      {renderStepIndicator()}

      {/* Content */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
      </ScrollView>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.footerBtnSecondary} onPress={handlePrevStep} activeOpacity={0.8}>
            <MaterialCommunityIcons name="chevron-left" size={22} color="#1D4ED8" />
            <Text style={styles.footerBtnSecondaryText}>Retour</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        {currentStep < 2 ? (
          <TouchableOpacity
            style={[styles.footerBtnPrimary, !canProceedStep1 && styles.footerBtnDisabled]}
            onPress={handleNextStep}
            activeOpacity={0.8}
            disabled={!canProceedStep1}
          >
            <Text style={styles.footerBtnPrimaryText}>Suivant</Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.footerBtnSuccess, !canSubmit && styles.footerBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={!canSubmit || submitting}
          >
            {submitting ? (
              <Text style={styles.footerBtnPrimaryText}>Création...</Text>
            ) : (
              <>
                <MaterialCommunityIcons name="check-bold" size={20} color="#fff" />
                <Text style={styles.footerBtnPrimaryText}>Créer Tournée</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  header: {
    backgroundColor: '#1D4ED8',
    paddingTop: 54,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  headerStep: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 4,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
  stepCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#1D4ED8',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
    borderRadius: 2,
  },
  stepLineCompleted: {
    backgroundColor: '#10B981',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  stepContent: {
    paddingTop: 8,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  selectionCard: {
    borderRadius: 20,
    marginBottom: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  menuContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  selectorSelected: {
    borderColor: '#1D4ED8',
    backgroundColor: '#EFF6FF',
  },
  selectorText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  selectorTextSelected: {
    color: '#111827',
    fontWeight: '600',
  },
  selectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
  },
  summaryPlate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
  },
  summaryArabic: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  summaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#065F46',
  },
  // Driver info styles
  driverFoundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  driverFoundTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  driverInfoBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  driverInfoValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
  },
  driverNewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  driverNewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },
  driverNewSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  driverInput: {
    backgroundColor: '#fff',
    fontSize: 15,
  },
  plateWrapper: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  plateOuter: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  plateInner: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: SCREEN_WIDTH - 60,
    gap: 12,
  },
  plateInputBox: {
    flex: 1,
    alignItems: 'center',
    minWidth: 85,
    maxWidth: 110,
  },
  plateInput: {
    backgroundColor: 'transparent',
    fontSize: 26,
    fontWeight: '800',
    height: 50,
    width: '100%',
  },
  plateInputHint: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: -4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  plateArabicBox: {
    paddingHorizontal: 8,
    minWidth: 60,
  },
  plateArabicText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  matriculePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  matriculePreviewPlate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matriculePreviewNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065F46',
  },
  matriculePreviewArabic: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065F46',
  },
  matriculePreviewText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065F46',
  },
  detailCard: {
    borderRadius: 20,
    marginBottom: 18,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  caissesInput: {
    backgroundColor: '#fff',
    fontSize: 18,
  },
  readySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
    paddingVertical: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
  },
  readyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  footerBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
  },
  footerBtnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  footerBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#1D4ED8',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  footerBtnPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  footerBtnSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  footerBtnDisabled: {
    opacity: 0.5,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  searchBar: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    elevation: 0,
  },
  searchInput: {
    fontSize: 16,
  },
  modalList: {
    paddingHorizontal: 20,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    marginBottom: 10,
  },
  modalItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  emptyListText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 15,
    paddingVertical: 30,
  },
  // Photo capture styles
  photoPreviewContainer: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 220,
    borderRadius: 20,
  },
  photoPreviewOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 10,
  },
  photoOverlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  photoSuccessBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  photoSuccessText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  photoCaptureBtn: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#DBEAFE',
    borderStyle: 'dashed',
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCaptureIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  photoCaptureTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  photoCaptureHint: {
    marginTop: 6,
    fontSize: 13,
    color: '#6B7280',
  },
});
