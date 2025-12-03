import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, Image } from 'react-native';
import { Text, TextInput, Button, Title, Menu } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import TunisianMatriculeInput from '../components/TunisianMatriculeInput';

export default function AgentControleCreateTourScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Data
  const [drivers, setDrivers] = useState<any[]>([]);
  const [secteurs, setSecteurs] = useState<any[]>([]);
  
  // Form
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [selectedSecteur, setSelectedSecteur] = useState<any>(null);
  const [matricule, setMatricule] = useState('');
  const [serieNumber, setSerieNumber] = useState('253');
  const [uniqueNumber, setUniqueNumber] = useState('');
  const [caissesDepart, setCaissesDepart] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // UI State
  const [showDriverMenu, setShowDriverMenu] = useState(false);
  const [showSecteurMenu, setShowSecteurMenu] = useState(false);

  useEffect(() => {
    loadData();
    fetchNextSerieNumber();
  }, []);

  const fetchNextSerieNumber = async () => {
    try {
      const response = await api.get('/api/matricules/next-serie');
      setSerieNumber(response.data.next_serie);
    } catch (error) {
      console.error('Error fetching next serie:', error);
      // Keep default 253 if error
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [driversRes, secteursRes] = await Promise.all([
        api.get('/api/drivers'),
        api.get('/api/secteurs')
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
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDriver || !selectedSecteur || !matricule || !caissesDepart || !photoUri) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs (matricule complet) et prendre une photo');
      return;
    }

    setSubmitting(true);
    try {
      const photoUrl = 'https://placeholder.com/photo_depart.jpg'; 

      await api.post('/api/tours/create', {
        driverId: selectedDriver.id,
        secteurId: selectedSecteur.id,
        agentControleId: user?.id,
        matricule_vehicule: matricule,
        nbre_caisses_depart: parseInt(caissesDepart),
        poids_net_produits_depart: 0, // Default 0 as per spec/discussion
        photo_preuve_depart_url: photoUrl,
      });

      Alert.alert('Succès', 'Tournée créée avec succès', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.error || 'Impossible de créer la tournée');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
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
        <Title style={styles.headerTitle}>Nouvelle Tournée</Title>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Chauffeur</Text>
          <Menu
            visible={showDriverMenu}
            onDismiss={() => setShowDriverMenu(false)}
            anchor={
              <Button 
                mode="outlined" 
                onPress={() => setShowDriverMenu(true)}
                style={styles.dropdownButton}
              >
                {selectedDriver ? selectedDriver.nom_complet : 'Sélectionner un chauffeur'}
              </Button>
            }
          >
            {drivers.map((driver) => (
              <Menu.Item 
                key={driver.id} 
                onPress={() => {
                  setSelectedDriver(driver);
                  setShowDriverMenu(false);
                  // Auto-fill matricule from driver's default if available
                  if (driver.matricule_par_defaut) {
                    const parts = driver.matricule_par_defaut.split(' ');
                    if (parts.length === 3) {
                      setSerieNumber(parts[0]);
                      setUniqueNumber(parts[2]);
                      setMatricule(driver.matricule_par_defaut);
                    }
                  }
                }} 
                title={driver.nom_complet} 
              />
            ))}
          </Menu>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Secteur</Text>
          <Menu
            visible={showSecteurMenu}
            onDismiss={() => setShowSecteurMenu(false)}
            anchor={
              <Button 
                mode="outlined" 
                onPress={() => setShowSecteurMenu(true)}
                style={styles.dropdownButton}
              >
                {selectedSecteur ? selectedSecteur.nom : 'Sélectionner un secteur'}
              </Button>
            }
          >
            {secteurs.map((secteur) => (
              <Menu.Item 
                key={secteur.id} 
                onPress={() => {
                  setSelectedSecteur(secteur);
                  setShowSecteurMenu(false);
                }} 
                title={secteur.nom} 
              />
            ))}
          </Menu>
        </View>

        <View style={styles.formGroup}>
          <TunisianMatriculeInput
            value={matricule}
            serieNumber={serieNumber}
            onChangeMatricule={(full, serie, unique) => {
              setMatricule(full);
              setSerieNumber(serie);
              setUniqueNumber(unique);
            }}
          />
        </View>

        <View style={styles.formGroup}>
          <TextInput
            label="Nombre de Caisses Départ"
            value={caissesDepart}
            onChangeText={setCaissesDepart}
            keyboardType="numeric"
            mode="outlined"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Photo Preuve Départ</Text>
          {photoUri ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photoUri }} style={styles.photo} />
              <Button mode="text" onPress={() => setPhotoUri(null)} icon="delete">
                Supprimer
              </Button>
            </View>
          ) : (
            <Button mode="contained" icon="camera" onPress={takePhoto} style={styles.photoButton}>
              Prendre Photo
            </Button>
          )}
        </View>

        <Button 
          mode="contained" 
          onPress={handleSubmit} 
          loading={submitting}
          disabled={submitting}
          style={styles.submitButton}
        >
          Créer Tournée
        </Button>
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
    backgroundColor: '#2196F3',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 10,
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
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  dropdownButton: {
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  photoContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  photoButton: {
    marginTop: 5,
    backgroundColor: '#607D8B',
  },
  submitButton: {
    marginTop: 20,
    marginBottom: 40,
    paddingVertical: 6,
    backgroundColor: '#4CAF50',
  },
});
