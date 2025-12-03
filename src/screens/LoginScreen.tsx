import React, { useState } from 'react';
import { View, StyleSheet, Alert, ImageBackground, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Title, Surface, useTheme } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const theme = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/mobile/login', { email, password });
      const { token, user } = response.data;
      
      // Check if user has valid role for mobile app
      const validRoles = ['AGENT_CONTROLE', 'AGENT_HYGIENE', 'SECURITE', 'admin', 'DIRECTION'];
      if (!validRoles.includes(user.role)) {
        Alert.alert(
          'Accès refusé', 
          'Votre rôle ne vous permet pas d\'utiliser l\'application mobile.'
        );
        setLoading(false);
        return;
      }
      
      await signIn(token, user);
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.error || 'Email ou mot de passe incorrect';
      Alert.alert('Erreur de connexion', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={[styles.headerContainer, { backgroundColor: theme.colors.primary }]}>
        <View style={styles.logoCircle}>
          <MaterialCommunityIcons name="package-variant-closed" size={48} color={theme.colors.primary} />
        </View>
        <Title style={styles.appTitle}>Caisse Management</Title>
        <Text style={styles.appSubtitle}>Solution Professionnelle B2B</Text>
      </View>

      <Surface style={styles.formSurface} elevation={4}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.welcomeText, { color: theme.colors.primary }]}>Bienvenue</Text>
          <Text style={styles.instructionText}>Connectez-vous à votre espace</Text>

          <TextInput
            label="Email Professionnel"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            left={<TextInput.Icon icon="email-outline" />}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
          />
          
          <TextInput
            label="Mot de passe"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            style={styles.input}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon 
                icon={showPassword ? "eye-off" : "eye"} 
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.primary}
          />

          <Button 
            mode="contained" 
            onPress={handleLogin} 
            loading={loading}
            disabled={loading}
            style={styles.loginButton}
            contentStyle={styles.loginButtonContent}
            labelStyle={styles.loginButtonLabel}
          >
            Se connecter
          </Button>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Accès Réservé</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.rolesContainer}>
            <View style={styles.roleItem}>
              <MaterialCommunityIcons name="shield-check" size={20} color="#666" />
              <Text style={styles.roleText}>Contrôle</Text>
            </View>
            <View style={styles.roleItem}>
              <MaterialCommunityIcons name="spray-bottle" size={20} color="#666" />
              <Text style={styles.roleText}>Hygiène</Text>
            </View>
            <View style={styles.roleItem}>
              <MaterialCommunityIcons name="security" size={20} color="#666" />
              <Text style={styles.roleText}>Sécurité</Text>
            </View>
          </View>
        </ScrollView>
      </Surface>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2025 Caisse Management System</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  headerContainer: {
    flex: 0.45,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontWeight: '500',
  },
  formSurface: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: -40,
    marginBottom: 20,
    borderRadius: 20,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  loginButton: {
    marginTop: 8,
    borderRadius: 10,
    elevation: 2,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#999',
    fontSize: 12,
    fontWeight: '500',
  },
  rolesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  roleItem: {
    alignItems: 'center',
    gap: 4,
  },
  roleText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  footer: {
    paddingBottom: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#999',
    fontSize: 12,
  },
});
