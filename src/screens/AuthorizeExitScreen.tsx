import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Text, Button, Card, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api';
import MatriculeText from '../components/MatriculeText';

const AR = {
  title: 'تصريح الخروج',
  driver: 'السائق',
  sector: 'القطاع',
  departure: 'خروج',
  return: 'عودة',
  confirm: 'تصريح الخروج النهائي',
  cancel: 'إلغاء',
  success: 'تم تصريح الخروج بنجاح',
};

export default function AuthorizeExitScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tourId } = route.params || {};
  
  const [tour, setTour] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get(`/api/tours/${tourId}`)
      .then(res => setTour(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tourId]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await api.patch(`/api/tours/${tourId}/exit`);
      setSuccess(true);
      setTimeout(() => navigation.goBack(), 1200);
    } catch (e) {
      setConfirming(false);
      Platform.OS === 'web' ? window.alert('خطأ') : null;
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4CAF50" /></View>;
  }

  if (success) {
    return (
      <View style={[styles.center, { backgroundColor: '#E8F5E9' }]}>
        <MaterialCommunityIcons name="check-circle" size={80} color="#4CAF50" />
        <Text style={styles.successText}>{AR.success}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-right" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{AR.title}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Matricule */}
        <Card style={styles.card}>
          <View style={styles.matriculeWrapper}>
            <MatriculeText matricule={tour?.matricule_vehicule} size="large" />
          </View>
        </Card>

        {/* Driver & Sector */}
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.cell}>
              <MaterialCommunityIcons name="account" size={24} color="#1a237e" />
              <Text style={styles.label}>{AR.driver}</Text>
              <Text style={styles.value}>{tour?.driver?.nom_complet || '-'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.cell}>
              <MaterialCommunityIcons name="map-marker" size={24} color="#E91E63" />
              <Text style={styles.label}>{AR.sector}</Text>
              <Text style={styles.value}>{tour?.secteur?.nom || '-'}</Text>
            </View>
          </View>
        </Card>

        {/* Caisses */}
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.cell}>
              <Text style={styles.label}>{AR.departure}</Text>
              <Text style={styles.bigValue}>{tour?.nbre_caisses_depart || 0}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.cell}>
              <Text style={styles.label}>{AR.return}</Text>
              <Text style={styles.bigValue}>{tour?.nbre_caisses_retour || 0}</Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Buttons */}
      <View style={styles.buttons}>
        <Button
          mode="contained"
          onPress={handleConfirm}
          loading={confirming}
          disabled={confirming}
          style={styles.confirmBtn}
          labelStyle={styles.btnLabel}
          icon="gate-open"
        >
          {AR.confirm}
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          disabled={confirming}
          style={styles.cancelBtn}
          icon="close"
        >
          {AR.cancel}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  successText: { fontSize: 22, fontWeight: 'bold', color: '#4CAF50', marginTop: 16 },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { padding: 8 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  matriculeWrapper: { alignItems: 'center', padding: 16 },
  row: { flexDirection: 'row', padding: 16 },
  cell: { flex: 1, alignItems: 'center' },
  divider: { width: 1, backgroundColor: '#e0e0e0' },
  label: { fontSize: 12, color: '#666', marginTop: 4 },
  value: { fontSize: 15, fontWeight: '600', color: '#333', marginTop: 2 },
  bigValue: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  buttons: { padding: 16, paddingBottom: 24, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', gap: 10 },
  confirmBtn: { backgroundColor: '#4CAF50', borderRadius: 10, paddingVertical: 4 },
  btnLabel: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  cancelBtn: { borderRadius: 10, borderColor: '#999' },
});
