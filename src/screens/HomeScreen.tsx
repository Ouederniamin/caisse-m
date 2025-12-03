import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Button, Card, Title, Paragraph, Chip } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen() {
  const { signOut, user } = useAuth();

  const getRoleLabel = (role: string | null) => {
    switch(role) {
      case 'AGENT_CONTROLE': return 'Agent de Contrôle';
      case 'AGENT_HYGIENE': return 'Agent d\'Hygiène';
      case 'SECURITE': return 'Sécurité';
      case 'DIRECTION': return 'Direction';
      case 'admin': return 'Administrateur';
      default: return role || 'Utilisateur';
    }
  };

  const getRoleColor = (role: string | null) => {
    switch(role) {
      case 'AGENT_CONTROLE': return '#2196F3';
      case 'AGENT_HYGIENE': return '#4CAF50';
      case 'SECURITE': return '#FF9800';
      case 'DIRECTION': return '#9C27B0';
      case 'admin': return '#9C27B0';
      default: return '#757575';
    }
  };

  const renderContent = () => {
    switch(user?.role) {
      case 'AGENT_CONTROLE':
        return (
          <Card style={styles.card}>
            <Card.Content>
              <Title>📋 Agent de Contrôle</Title>
              <Paragraph style={styles.instruction}>
                Utilisez les onglets en bas pour accéder rapidement à vos tournées
                et gérer les retours.
              </Paragraph>
            </Card.Content>
          </Card>
        );
      case 'AGENT_HYGIENE':
        return (
          <Card style={styles.card}>
            <Card.Content>
              <Title>🧤 Agent d'Hygiène</Title>
              <Paragraph style={styles.instruction}>
                Depuis les onglets, accédez à la file des tournées à contrôler et
                finalisez les inspections.
              </Paragraph>
            </Card.Content>
          </Card>
        );
      case 'SECURITE':
        return (
          <Card style={styles.card}>
            <Card.Content>
              <Title>⚖️ Sécurité</Title>
              <Paragraph style={styles.instruction}>
                L'onglet Sécurité vous permet d'effectuer les pesées sortie et
                entrée par recherche de matricule.
              </Paragraph>
            </Card.Content>
          </Card>
        );
      case 'DIRECTION':
        return (
          <Card style={styles.card}>
            <Card.Content>
              <Title>👔 Direction</Title>
              <Paragraph style={styles.instruction}>
                Retrouvez vos indicateurs clés et la liste des conflits via
                l'onglet Direction en bas de l'écran.
              </Paragraph>
            </Card.Content>
          </Card>
        );
      default:
        return (
          <Card style={styles.card}>
            <Card.Content>
              <Title>Bienvenue</Title>
              <Paragraph>Votre rôle n'a pas encore été configuré pour cette application.</Paragraph>
            </Card.Content>
          </Card>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: getRoleColor(user?.role || null) }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Bonjour,</Text>
            <Title style={styles.userName}>{user?.name || user?.email || 'Agent'}</Title>
            <Chip 
              style={styles.roleChip} 
              textStyle={styles.roleChipText}
              icon="shield-account"
            >
              {getRoleLabel(user?.role || null)}
            </Chip>
          </View>
          <Button 
            mode="contained-tonal" 
            onPress={signOut}
            textColor="#fff"
            style={styles.logoutButton}
          >
            Déconnexion
          </Button>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {renderContent()}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Caisse Management System v1.0</Text>
        </View>
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
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeText: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.9,
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
  roleChip: {
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'flex-start',
  },
  roleChipText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    marginBottom: 15,
    elevation: 2,
  },
  demo: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
  actionButton: {
    flex: 1,
  },
  imageCaption: {
    paddingTop: 10,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  footerText: {
    color: '#999',
    fontSize: 12,
  },
  instruction: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  bold: {
    fontWeight: 'bold',
    color: '#333',
  },
});
