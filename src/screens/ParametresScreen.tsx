import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, Linking, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text, Card, Title, List, Divider, Button, Avatar, Portal, Modal, Paragraph } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

export default function ParametresScreen() {
  const navigation = useNavigation<any>();
  const { signOut, user } = useAuth();
  const [showGuideModal, setShowGuideModal] = useState(false);

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

  const getRoleIcon = (role: string | null) => {
    switch(role) {
      case 'AGENT_CONTROLE': return 'clipboard-check-outline';
      case 'AGENT_HYGIENE': return 'spray-bottle';
      case 'SECURITE': return 'shield-lock-outline';
      case 'DIRECTION': return 'briefcase-outline';
      case 'admin': return 'crown-outline';
      default: return 'account';
    }
  };

  const handleLogout = async () => {
    // Use a cross-platform modal-free immediate logout (Alert button handlers can be flaky on web)
    try {
      console.log('[UI] Logout triggered');
      await signOut();
      // Force navigation reset (in case stack doesn't re-render immediately)
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Erreur', 'Impossible de se déconnecter');
    }
  };

  const handleSupportEmail = async () => {
    const email = 'support@caisse-management.com';
    const subject = encodeURIComponent('Support Technique - Caisse Management');
    const body = encodeURIComponent(
      `Bonjour,\n\nNom: ${user?.name || 'N/A'}\nEmail: ${user?.email || 'N/A'}\nRôle: ${getRoleLabel(user?.role || null)}\n\nDescription du problème:\n\n`
    );
    
    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;
    
    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert(
          'Email non configuré',
          `Veuillez contacter le support à:\n${email}`,
          [
            { 
              text: 'Copier l\'email', 
              onPress: () => {
                // In production, use Clipboard API
                Alert.alert('Email', email);
              }
            },
            { text: 'OK' }
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Support Technique',
        `Contactez-nous par email:\n${email}\n\nOu appelez le: +216 XX XXX XXX`
      );
    }
  };

  const handleOpenGuide = () => {
    setShowGuideModal(true);
  };

  const getGuideContent = () => {
    switch(user?.role) {
      case 'AGENT_CONTROLE':
        return {
          title: '📋 Guide Agent de Contrôle',
          sections: [
            {
              title: '1. Créer une nouvelle tournée',
              content: 'Appuyez sur le bouton "+" en bas à droite. Sélectionnez le chauffeur, le secteur, entrez le matricule et le nombre de caisses. Prenez une photo de preuve avant le départ.'
            },
            {
              title: '2. Gérer les retours',
              content: 'Dans la liste des tournées, sélectionnez une tournée "En attente déchargement". Comptez les caisses retournées, prenez une photo, et indiquez si des produits poulet sont présents.'
            },
            {
              title: '3. Gestion des conflits',
              content: 'Un conflit est automatiquement créé si la différence de caisses dépasse la tolérance du chauffeur. La direction sera notifiée.'
            }
          ]
        };
      case 'AGENT_HYGIENE':
        return {
          title: '🧤 Guide Agent d\'Hygiène',
          sections: [
            {
              title: '1. Contrôler une tournée',
              content: 'Sélectionnez une tournée en attente d\'hygiène. Prenez plusieurs photos du matériel retourné.'
            },
            {
              title: '2. Valider l\'inspection',
              content: 'Ajoutez des notes si nécessaire. Approuvez si le matériel est propre, ou rejetez s\'il nécessite un nettoyage supplémentaire.'
            },
            {
              title: '3. Finalisation',
              content: 'Une fois approuvée, la tournée sera marquée comme terminée. En cas de rejet, le chauffeur devra nettoyer à nouveau.'
            }
          ]
        };
      case 'SECURITE':
        return {
          title: '⚖️ Guide Sécurité',
          sections: [
            {
              title: '1. Pesée sortie',
              content: 'Recherchez le véhicule par matricule. Vérifiez le matricule correspond, puis entrez le poids brut. Le véhicule peut ensuite partir en tournée.'
            },
            {
              title: '2. Pesée entrée',
              content: 'Recherchez le véhicule de retour par matricule. Vérifiez le matricule, puis entrez le poids brut de retour.'
            },
            {
              title: '3. Format matricule',
              content: 'Format tunisien: XXX تونس XXXX (ex: 238 تونس 8008). Le système normalise automatiquement les espaces.'
            }
          ]
        };
      case 'DIRECTION':
        return {
          title: '👔 Guide Direction',
          sections: [
            {
              title: '1. Tableau de bord',
              content: 'Consultez les statistiques globales: total des tournées, en cours, terminées, et nombre de conflits.'
            },
            {
              title: '2. Gestion des conflits',
              content: 'Dans l\'onglet "Conflits", vous pouvez voir les différences de caisses et leur valeur. Approuvez les conflits après vérification.'
            },
            {
              title: '3. Suivi des tournées',
              content: 'Dans l\'onglet "Tournées", suivez l\'état de toutes les tournées en temps réel avec leur statut et secteur.'
            }
          ]
        };
      default:
        return {
          title: '📖 Guide d\'utilisation',
          sections: [
            {
              title: 'Navigation',
              content: 'Utilisez les onglets en bas de l\'écran pour naviguer entre les différentes sections de l\'application.'
            },
            {
              title: 'Support',
              content: 'Pour toute question, contactez le support technique depuis les paramètres.'
            }
          ]
        };
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: getRoleColor(user?.role || null) }]}>
        <Title style={styles.headerTitle}>⚙️ Paramètres</Title>
      </View>

      <ScrollView style={styles.content}>
        <Card style={styles.profileCard}>
          <Card.Content style={styles.profileContent}>
            <Avatar.Icon 
              size={64} 
              icon={getRoleIcon(user?.role || null)} 
              style={[styles.avatar, { backgroundColor: getRoleColor(user?.role || null) }]}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'Utilisateur'}</Text>
              <Text style={styles.profileEmail}>{user?.email || ''}</Text>
              <Text style={[styles.profileRole, { color: getRoleColor(user?.role || null) }]}>
                {getRoleLabel(user?.role || null)}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Compte</Title>
          </Card.Content>
          <List.Item
            title="Nom d'utilisateur"
            description={user?.name || 'Non défini'}
            left={props => <List.Icon {...props} icon="account" />}
          />
          <Divider />
          <List.Item
            title="Email"
            description={user?.email || 'Non défini'}
            left={props => <List.Icon {...props} icon="email" />}
          />
          <Divider />
          <List.Item
            title="Rôle"
            description={getRoleLabel(user?.role || null)}
            left={props => <List.Icon {...props} icon={getRoleIcon(user?.role || null)} />}
          />
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Application</Title>
          </Card.Content>
          <List.Item
            title="Version"
            description="1.0.0"
            left={props => <List.Icon {...props} icon="information" />}
          />
          <Divider />
          <List.Item
            title="À propos"
            description="Caisse Management System"
            left={props => <List.Icon {...props} icon="information-outline" />}
          />
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Assistance</Title>
          </Card.Content>
          <List.Item
            title="Support technique"
            description="Contactez l'équipe support"
            left={props => <List.Icon {...props} icon="help-circle" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleSupportEmail}
          />
          <Divider />
          <List.Item
            title="Guide d'utilisation"
            description="Consulter le manuel"
            left={props => <List.Icon {...props} icon="book-open-variant" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleOpenGuide}
          />
        </Card>

        <View style={styles.logoutContainer}>
          <Button
            mode="contained"
            onPress={handleLogout}
            icon="logout"
            style={styles.logoutButton}
            buttonColor="#F44336"
          >
            Déconnexion
          </Button>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 Caisse Management System</Text>
          <Text style={styles.footerText}>Solution Professionnelle B2B</Text>
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={showGuideModal}
          onDismiss={() => setShowGuideModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <Title style={styles.modalTitle}>{getGuideContent().title}</Title>
              
              <ScrollView style={styles.guideScroll}>
                {getGuideContent().sections.map((section, index) => (
                  <View key={index} style={styles.guideSection}>
                    <Text style={styles.guideSectionTitle}>{section.title}</Text>
                    <Paragraph style={styles.guideSectionContent}>
                      {section.content}
                    </Paragraph>
                  </View>
                ))}

                <View style={styles.guideFooter}>
                  <Paragraph style={styles.guideFooterText}>
                    Pour plus d'informations, contactez le support technique.
                  </Paragraph>
                </View>
              </ScrollView>

              <Button
                mode="contained"
                onPress={() => setShowGuideModal(false)}
                style={styles.closeButton}
              >
                Fermer
              </Button>
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
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileCard: {
    marginBottom: 20,
    elevation: 3,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  profileRole: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  card: {
    marginBottom: 20,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutContainer: {
    marginVertical: 20,
  },
  logoutButton: {
    paddingVertical: 6,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  footerText: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
  modalContainer: {
    margin: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  guideScroll: {
    maxHeight: 400,
  },
  guideSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  guideSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  guideSectionContent: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  guideFooter: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  guideFooterText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  closeButton: {
    marginTop: 15,
    paddingVertical: 4,
  },
});
