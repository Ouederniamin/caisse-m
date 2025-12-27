import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Text, Button, Card, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api';
import MatriculeText from '../components/MatriculeText';

const AR = {
  title: 'تأكيد الوصول',
  driver: 'السائق',
  sector: 'القطاع',
  caisses: 'صندوق',
  departure: 'الخروج',
  confirm: 'تأكيد',
  cancel: 'إلغاء',
  success: 'تم تسجيل الوصول ✓',
};

export default function ConfirmArrivalScreen() {
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
      await api.patch(`/api/tours/${tourId}/retour-securite`);
      setSuccess(true);
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      }, 1200);
    } catch (e) {
      setConfirming(false);
      Platform.OS === 'web' && window.alert('خطأ في تسجيل الوصول');
    }
  };

  const formatTime = (d: string) => d ? new Date(d).toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' }) : '-';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF9800" />
      </View>
    );
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
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name="map-marker-check" size={28} color="#fff" />
          <Text style={styles.headerTitle}>{AR.title}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Matricule */}
      <Card style={styles.card}>
        <View style={styles.matriculeWrapper}>
          <MatriculeText matricule={tour?.matricule_vehicule} size="large" />
        </View>
      </Card>

      {/* Info Grid - Two Rows */}
      <Card style={styles.card}>
        <View style={styles.infoGrid}>
          {/* Row 1 */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="account" size={22} color="#1a237e" />
              <Text style={styles.infoLabel}>{AR.driver}</Text>
              <Text style={styles.infoValue}>{tour?.driver?.nom_complet || '-'}</Text>
            </View>
            <View style={styles.dividerV} />
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="map-marker" size={22} color="#E91E63" />
              <Text style={styles.infoLabel}>{AR.sector}</Text>
              <Text style={styles.infoValue}>{tour?.secteurs_noms || tour?.secteur?.nom || '-'}</Text>
            </View>
          </View>
          <View style={styles.dividerH} />
          {/* Row 2 */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="package-variant" size={22} color="#2196F3" />
              <Text style={styles.infoLabel}>{AR.caisses}</Text>
              <Text style={styles.infoValue}>{tour?.nbre_caisses_depart || 0}</Text>
            </View>
            <View style={styles.dividerV} />
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="clock-outline" size={22} color="#FF9800" />
              <Text style={styles.infoLabel}>{AR.departure}</Text>
              <Text style={styles.infoValue}>{formatTime(tour?.date_sortie_securite)}</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Buttons */}
      <View style={styles.buttons}>
        <Button
          mode="contained"
          onPress={handleConfirm}
          loading={confirming}
          disabled={confirming}
          style={styles.confirmBtn}
          labelStyle={styles.btnLabel}
          icon="check"
        >
          {AR.confirm}
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          disabled={confirming}
          style={styles.cancelBtn}
          labelStyle={styles.cancelLabel}
          icon="close"
        >
          {AR.cancel}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  successText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 16,
  },
  header: {
    backgroundColor: '#FF9800',
    paddingTop: Platform.OS === 'web' ? 20 : 45,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 8,
  },
  headerCenter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  headerSpacer: {
    width: 44,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    elevation: 3,
  },
  matriculeWrapper: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  infoGrid: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  dividerV: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerH: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
  infoLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  buttons: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 24,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
  },
  cancelBtn: {
    flex: 1,
    borderColor: '#f44336',
    borderWidth: 2,
    borderRadius: 10,
  },
  btnLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingVertical: 4,
  },
  cancelLabel: {
    fontSize: 16,
    color: '#f44336',
    paddingVertical: 4,
  },
});
