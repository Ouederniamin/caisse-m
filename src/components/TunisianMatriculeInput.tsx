import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput as RNTextInput } from 'react-native';
import { Text } from 'react-native-paper';

interface TunisianMatriculeInputProps {
  value?: string; // Full matricule like "960 تونس 9438"
  onChangeMatricule: (fullMatricule: string, serieNumber: string, uniqueNumber: string) => void;
  serieNumber?: string; // Left 3 digits (auto-filled from backend)
  disabled?: boolean;
  error?: boolean;
}

export default function TunisianMatriculeInput({
  value = '',
  onChangeMatricule,
  serieNumber: propSerieNumber,
  disabled = false,
  error = false,
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
      <Text style={styles.label}>Matricule Véhicule</Text>
      
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

      <Text style={styles.hint}>
        Saisissez le numéro de série (3 chiffres) et numéro unique (4 chiffres)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 12,
    color: '#333',
    fontWeight: '600',
  },
  plateContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  plateInner: {
    backgroundColor: '#000',
    borderRadius: 6,
    borderWidth: 3,
    borderColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 55,
  },
  leftInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    padding: 0,
    backgroundColor: 'transparent',
    fontFamily: 'monospace',
  },
  arabicSection: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  arabicText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
  },
  rightInput: {
    flex: 1.2,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    padding: 0,
    backgroundColor: 'transparent',
    fontFamily: 'monospace',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
