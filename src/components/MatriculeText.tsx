/**
 * Component for displaying Tunisian vehicle matricules in React Native
 * Displays matricules exactly like real Tunisian license plates:
 * White text on black background with proper spacing
 * Format: 199 تونس 199
 */

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

interface MatriculeTextProps {
  matricule: string;
  style?: any;
  size?: 'small' | 'medium' | 'large';
}

export default function MatriculeText({ matricule, style, size = 'medium' }: MatriculeTextProps) {
  // Parse the matricule to ensure proper display
  const parts = matricule.match(/(\d{2,3})\s*تونس\s*(\d{3,4})/);
  
  if (!parts) {
    // Fallback if format doesn't match
    return (
      <View style={[plateStyles.plate, plateStyles[size], style]}>
        <Text style={[plateStyles.text, plateStyles[`${size}Text`]]}>{matricule}</Text>
      </View>
    );
  }

  const [, serie, unique] = parts;

  // Real Tunisian plate format: 3 digits (left) + تونس (center) + 4 digits (right)
  return (
    <View style={[plateStyles.plate, plateStyles[size], style]}>
      <Text style={[plateStyles.text, plateStyles[`${size}Text`]]}>{serie}</Text>
      <Text style={[plateStyles.arabic, plateStyles[`${size}Arabic`]]}>تونس</Text>
      <Text style={[plateStyles.text, plateStyles[`${size}Text`]]}>{unique}</Text>
    </View>
  );
}

const plateStyles = StyleSheet.create({
  plate: {
    backgroundColor: '#000000',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  small: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 6,
    borderWidth: 2,
    borderRadius: 6,
  },
  medium: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 3,
    borderRadius: 8,
  },
  large: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
    borderWidth: 4,
    borderRadius: 10,
  },
  text: {
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 18,
  },
  largeText: {
    fontSize: 24,
  },
  arabic: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    writingDirection: 'rtl',
  },
  smallArabic: {
    fontSize: 12,
  },
  mediumArabic: {
    fontSize: 16,
  },
  largeArabic: {
    fontSize: 22,
  },
});

/**
 * Badge variant with background (deprecated - use default MatriculeText for license plate style)
 */
export function MatriculeBadge({ matricule, style }: MatriculeTextProps) {
  const parts = matricule.match(/(\d{2,3})\s*تونس\s*(\d{3,4})/);
  
  if (!parts) {
    return (
      <View style={[badgeStyles.container, badgeStyles.fallbackContainer, style]}>
        <Text style={badgeStyles.fallbackText}>{matricule}</Text>
      </View>
    );
  }

  const [, serie, unique] = parts;

  // Real Tunisian plate format: 3 digits (left) + تونس (center) + 4 digits (right)
  return (
    <View style={[badgeStyles.container, style]}>
      <Text style={badgeStyles.number}>{serie}</Text>
      <Text style={badgeStyles.arabic}>تونس</Text>
      <Text style={badgeStyles.number}>{unique}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#000000',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  fallbackContainer: {
    backgroundColor: '#1f2937',
  },
  number: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  arabic: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    writingDirection: 'rtl',
  },
  fallbackText: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
