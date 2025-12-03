import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  TextInput,
  Modal,
  Portal,
  Paragraph,
} from 'react-native-paper';
import api from '../services/api';
import { normalizeMatriculeInput, matriculesEqual } from '../utils/matricule';
import MatriculeText from '../components/MatriculeText';

interface PeseeSortieScreenProps {
  route: any;
  navigation: any;
}

export default function PeseeSortieScreen({ route, navigation }: PeseeSortieScreenProps) {
  const { tourId } = route.params;
  const [tour, setTour] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matriculeInput, setMatriculeInput] = useState('');
  const [poidsInput, setPoidsInput] = useState('');
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

  const handleMatriculeVerification = () => {
    if (!matriculeInput.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir le matricule du véhicule');
      return;
    }

    // Normalize both matricules before comparison
    const normalizedInput = normalizeMatriculeInput(matriculeInput);
    const normalizedTour = normalizeMatriculeInput(tour.matricule_vehicule);

    if (!normalizedInput) {
      Alert.alert(
        '⚠️ Format Incorrect',
        `Le matricule saisi n'est pas au format tunisien valide.\n\nFormat attendu: 3 chiffres + تونس + 4 chiffres\nExemple: 260 تونس 8008`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (!matriculesEqual(matriculeInput, tour.matricule_vehicule)) {
      Alert.alert(
        '⚠️ Matricule Incorrect',
        `Le matricule saisi (${normalizedInput}) ne correspond pas au matricule de la tournée (${normalizedTour}).\n\nVeuillez vérifier et réessayer.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Matricule verified, proceed to weight input
    setShowConfirmModal(true);
  };

  const handleSubmitPesee = async () => {
    if (!poidsInput || parseFloat(poidsInput) <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un poids valide');
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/api/tours/${tourId}/sortie`, {
        poids_brut_securite_sortie: parseFloat(poidsInput),
        matricule_vehicule: matriculeInput.trim().toUpperCase(),
      });

      Alert.alert(
        '✅ Pesée Sortie Enregistrée',
        `Le véhicule ${tour.matricule_vehicule} peut maintenant partir en tournée.\n\nPoids brut: ${poidsInput} kg`,
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
        error.response?.data?.error || 'Impossible d\'enregistrer la pesée'
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
        <Title style={styles.headerTitle}>⚖️ Pesée Sortie</Title>
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
              <Text style={styles.label}>Caisses:</Text>
              <Text style={styles.value}>{tour.nombre_caisses_livrees}</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Étape 1: Vérification Matricule</Title>
            <Paragraph style={styles.instruction}>
              Veuillez confirmer le matricule du véhicule avant la pesée
            </Paragraph>

            <TextInput
              label="Matricule du véhicule"
              value={matriculeInput}
              onChangeText={setMatriculeInput}
              mode="outlined"
              placeholder="238 تونس 8008"
              style={styles.input}
              left={<TextInput.Icon icon="car" />}
            />

            <Button
              mode="contained"
              onPress={handleMatriculeVerification}
              style={styles.verifyButton}
              icon="check-circle"
              disabled={!matriculeInput.trim()}
            >
              Vérifier Matricule
            </Button>
          </Card.Content>
        </Card>

        <Card style={[styles.card, styles.infoCard]}>
          <Card.Content>
            <Paragraph style={styles.infoText}>
              ℹ️ Le matricule doit correspondre exactement à celui de la tournée
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
              <Title style={styles.modalTitle}>✅ Matricule Vérifié</Title>
              <Paragraph style={styles.modalText}>
                Matricule confirmé: {tour.matricule_vehicule}
              </Paragraph>

              <TextInput
                label="Poids Brut (kg)"
                value={poidsInput}
                onChangeText={setPoidsInput}
                mode="outlined"
                keyboardType="numeric"
                placeholder="0.00"
                style={styles.input}
                left={<TextInput.Icon icon="scale" />}
              />

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
                  onPress={handleSubmitPesee}
                  style={[styles.modalButton, styles.confirmButton]}
                  loading={submitting}
                  disabled={submitting || !poidsInput}
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
    backgroundColor: '#FF9800',
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
  input: {
    marginBottom: 15,
  },
  verifyButton: {
    backgroundColor: '#2196F3',
    marginTop: 10,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
  },
  infoText: {
    fontSize: 13,
    color: '#1976D2',
  },
  modalContainer: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#4CAF50',
  },
  modalText: {
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
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
});
