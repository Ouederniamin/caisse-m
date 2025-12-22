import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput as RNTextInput, Platform } from 'react-native';
import { Text } from 'react-native-paper';

// Arabic translations
const AR = {
  vehicleMatricule: 'ترقيم المركبة',
  hint: 'أدخل رقم السلسلة (3 أرقام) والرقم الفريد (4 أرقام)',
};

interface TunisianMatriculeInputProps {
  value?: string; // Full matricule like "960 تونس 9438"
  onChangeMatricule: (fullMatricule: string, serieNumber: string, uniqueNumber: string) => void;
  serieNumber?: string; // Left 3 digits (auto-filled from backend)
  disabled?: boolean;
  error?: boolean;
  rtl?: boolean; // RTL mode for Arabic (SECURITE role)
}

export default function TunisianMatriculeInput({
  value = '',
  onChangeMatricule,
  serieNumber: propSerieNumber,
  disabled = false,
  error = false,
  rtl = false,
}: TunisianMatriculeInputProps) {
  const [serieNumber, setSerieNumber] = useState(propSerieNumber || '253');
  const [uniqueNumber, setUniqueNumber] = useState('');

  useEffect(() => {
    // Parse existing value if provided
    if (value) {
      const parts = value.split(' ');
      if (parts.length === 3) {
        setSerieNumber(parts[0]);
        setUniqueNumber(parts[2]);
      }
    }
  }, [value]);

  useEffect(() => {
    if (propSerieNumber) {
      setSerieNumber(propSerieNumber);
    }
  }, [propSerieNumber]);

  useEffect(() => {
    // Update parent whenever numbers change
    if (serieNumber && uniqueNumber) {
      const fullMatricule = `${serieNumber} تونس ${uniqueNumber}`;
      onChangeMatricule(fullMatricule, serieNumber, uniqueNumber);
    }
  }, [serieNumber, uniqueNumber]);

  const handleSerieChange = (text: string) => {
    // Only allow numbers, max 3 digits
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 3);
    setSerieNumber(cleaned);
  };

  const handleUniqueChange = (text: string) => {
    // Only allow numbers, max 4 digits
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
    setUniqueNumber(cleaned);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, rtl && styles.labelRtl]}>
        {rtl ? AR.vehicleMatricule : 'Matricule Véhicule'}
      </Text>
      
      {/* Matricule Plate Preview (Like Real Tunisian Plate) */}
      <View style={styles.plateContainer}>
        <View style={styles.plateInner}>
          <RNTextInput
            value={serieNumber}
            onChangeText={handleSerieChange}
            keyboardType="numeric"
            maxLength={3}
            style={styles.leftInput}
            editable={!disabled}
            placeholder="960"
            placeholderTextColor="#666"
          />
          
          <View style={styles.arabicSection}>
            <Text style={styles.arabicText}>تونس</Text>
          </View>
          
          <RNTextInput
            value={uniqueNumber}
            onChangeText={handleUniqueChange}
            keyboardType="numeric"
            maxLength={4}
            style={styles.rightInput}
            editable={!disabled}
            placeholder="9438"
            placeholderTextColor="#666"
          />
        </View>
      </View>

      <Text style={[styles.hint, rtl && styles.hintRtl]}>
        {rtl ? AR.hint : 'Saisissez le numéro de série (3 chiffres) et numéro unique (4 chiffres)'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 12,
    color: '#333',
    fontWeight: '600',
    alignSelf: 'flex-start',
  },
  labelRtl: {
    alignSelf: 'flex-end',
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif',
  },
  plateContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 5,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    width: '100%',
    maxWidth: 340,
  },
  plateInner: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 65,
  },
  leftInput: {
    width: 80,
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    padding: 0,
    backgroundColor: 'transparent',
    fontFamily: 'monospace',
  },
  arabicSection: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#444',
    marginHorizontal: 8,
  },
  arabicText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
  },
  rightInput: {
    width: 100,
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    padding: 0,
    backgroundColor: 'transparent',
    fontFamily: 'monospace',
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginTop: 10,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  hintRtl: {
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif',
    fontStyle: 'normal',
  },
});
