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
import MatriculeText from '../components/MatriculeText';

interface PeseeEntreeScreenProps {
  route: any;
  navigation: any;
}

export default function PeseeEntreeScreen({ route, navigation }: PeseeEntreeScreenProps) {
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

    if (matriculeInput.trim().toUpperCase() !== tour.matricule_vehicule.toUpperCase()) {
      Alert.alert(
        '⚠️ Matricule Incorrect',
        `Le matricule saisi (${matriculeInput}) ne correspond pas au matricule de la tournée (${tour.matricule_vehicule}).\n\nVeuillez vérifier et réessayer.`,
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
      await api.patch(`/api/tours/${tourId}/entree`, {
        poids_brut_securite_retour: parseFloat(poidsInput),
        matricule_vehicule: matriculeInput.trim().toUpperCase(),
      });

      const poidsNet = parseFloat(poidsInput) - (tour.poids_brut_securite_sortie || 0);

      Alert.alert(
        '✅ Pesée Entrée Enregistrée',
        `Le véhicule ${tour.matricule_vehicule} peut maintenant être déchargé.\n\nPoids brut retour: ${poidsInput} kg\nPoids net: ${poidsNet.toFixed(2)} kg`,
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

  const poidsNet = poidsInput
    ? parseFloat(poidsInput) - (tour.poids_brut_securite_sortie || 0)
    : 0;

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
        <Title style={styles.headerTitle}>⚖️ Pesée Entrée</Title>
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
              <Text style={styles.label}>Poids Sortie:</Text>
              <Text style={styles.value}>{tour.poids_brut_securite_sortie} kg</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Étape 1: Vérification Matricule</Title>
            <Paragraph style={styles.instruction}>
              Veuillez confirmer le matricule du véhicule de retour
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
              ℹ️ Le poids net sera calculé automatiquement (Retour - Sortie)
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

              <View style={styles.weightSummary}>
                <View style={styles.weightRow}>
                  <Text style={styles.weightLabel}>Poids Sortie:</Text>
                  <Text style={styles.weightValue}>
                    {tour.poids_brut_securite_sortie} kg
                  </Text>
                </View>
              </View>

              <TextInput
                label="Poids Brut Retour (kg)"
                value={poidsInput}
                onChangeText={setPoidsInput}
                mode="outlined"
                keyboardType="numeric"
                placeholder="0.00"
                style={styles.input}
                left={<TextInput.Icon icon="scale" />}
              />

              {poidsInput && (
                <View style={styles.calculatedWeight}>
                  <Text style={styles.calculatedLabel}>Poids Net Calculé:</Text>
                  <Text
                    style={[
                      styles.calculatedValue,
                      poidsNet < 0 ? styles.negativeWeight : styles.positiveWeight,
                    ]}
                  >
                    {poidsNet.toFixed(2)} kg
                  </Text>
                </View>
              )}

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
    backgroundColor: '#9C27B0',
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
    backgroundColor: '#F3E5F5',
  },
  infoText: {
    fontSize: 13,
    color: '#7B1FA2',
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
  weightSummary: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weightLabel: {
    fontSize: 14,
    color: '#666',
  },
  weightValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  calculatedWeight: {
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calculatedLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  calculatedValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  positiveWeight: {
    color: '#2E7D32',
  },
  negativeWeight: {
    color: '#C62828',
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
