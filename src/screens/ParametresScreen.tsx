import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, Linking, Platform, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text, Portal, Modal, Button, Surface, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

const APP_VERSION = '1.0.0';
const COMPANY_NAME = 'El Firma';
const SUPPORT_EMAIL = 'support@elfirma.tn';
const SUPPORT_PHONE = '+216 71 XXX XXX';

// Arabic translations for SECURITE role
const AR = {
  companyTagline: 'إدارة الصناديق',
  account: 'الحساب',
  profile: 'الملف الشخصي',
  email: 'البريد الإلكتروني',
  role: 'الدور',
  application: 'التطبيق',
  version: 'الإصدار',
  platform: 'المنصة',
  helpSupport: 'المساعدة والدعم',
  technicalSupport: 'الدعم الفني',
  contactTeam: 'التواصل مع الفريق',
  userGuide: 'دليل الاستخدام',
  viewManual: 'عرض الدليل',
  phone: 'الهاتف',
  logout: 'تسجيل الخروج',
  logoutConfirm: 'هل تريد تسجيل الخروج؟',
  cancel: 'إلغاء',
  error: 'خطأ',
  logoutError: 'تعذر تسجيل الخروج',
  copyright: '© 2025',
  professionalSolution: 'حل احترافي للإدارة',
  understood: 'فهمت',
  moreHelp: 'لمزيد من المساعدة، تواصل مع الدعم الفني.',
  notDefined: 'غير محدد',
  user: 'مستخدم',
  securityAgent: 'عامل الأمن',
  guideTitle: 'دليل الأمن',
  exitWeighing: 'وزن الخروج',
  exitWeighingDesc: 'ابحث عن المركبة بالترقيم وأدخل الوزن الإجمالي قبل المغادرة.',
  entryWeighing: 'وزن الدخول',
  entryWeighingDesc: 'عند العودة، قم بوزن المركبة مرة أخرى وسجل الوزن.',
  plateFormat: 'صيغة الترقيم',
  plateFormatDesc: 'الصيغة التونسية: XXX تونس XXXX (مثال: 238 تونس 8008).',
  web: 'الويب',
};

export default function ParametresScreen() {
  const navigation = useNavigation<any>();
  const { signOut, user } = useAuth();
  const [showGuideModal, setShowGuideModal] = useState(false);
  
  // Check if user is SECURITE for Arabic RTL
  const isSecurite = user?.role === 'SECURITE';

  const getRoleConfig = (role: string | null) => {
    const configs: Record<string, { label: string; icon: string; colors: [string, string]; lightBg: string }> = {
      'AGENT_CONTROLE': {
        label: 'Agent de Contrôle',
        icon: 'clipboard-check',
        colors: ['#1976D2', '#1565C0'],
        lightBg: '#E3F2FD'
      },
      'AGENT_HYGIENE': {
        label: 'Agent Hygiène',
        icon: 'spray-bottle',
        colors: ['#2E7D32', '#1B5E20'],
        lightBg: '#E8F5E9'
      },
      'SECURITE': {
        label: isSecurite ? AR.securityAgent : 'Agent Sécurité',
        icon: 'shield-check',
        colors: ['#E65100', '#BF360C'],
        lightBg: '#FFF3E0'
      },
      'DIRECTION': {
        label: 'Direction',
        icon: 'briefcase',
        colors: ['#7B1FA2', '#6A1B9A'],
        lightBg: '#F3E5F5'
      },
      'admin': {
        label: 'Administrateur',
        icon: 'crown',
        colors: ['#C62828', '#B71C1C'],
        lightBg: '#FFEBEE'
      }
    };
    return configs[role || ''] || {
      label: 'Utilisateur',
      icon: 'account',
      colors: ['#616161', '#424242'],
      lightBg: '#F5F5F5'
    };
  };

  const roleConfig = getRoleConfig(user?.role || null);

  const handleLogout = async () => {
    const doLogout = async () => {
      try {
        await signOut();
        // Navigation is handled automatically by AuthContext - when userToken becomes null,
        // the App.tsx conditional rendering will show the Login screen
      } catch (error) {
        console.error('Logout error:', error);
        if (Platform.OS === 'web') {
          window.alert('Erreur lors de la déconnexion');
        } else {
          Alert.alert('Erreur', 'Impossible de se déconnecter');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(isSecurite ? AR.logoutConfirm : 'Voulez-vous vous déconnecter?')) {
        doLogout();
      }
    } else {
      Alert.alert(
        isSecurite ? AR.logout : 'Déconnexion',
        isSecurite ? AR.logoutConfirm : 'Voulez-vous vous déconnecter?',
        [
          { text: isSecurite ? AR.cancel : 'Annuler', style: 'cancel' },
          { text: isSecurite ? AR.logout : 'Déconnexion', style: 'destructive', onPress: doLogout }
        ]
      );
    }
  };

  const handleSupportEmail = async () => {
    const subject = encodeURIComponent(`Support - ${COMPANY_NAME} App`);
    const body = encodeURIComponent(
      `Bonjour,\n\nNom: ${user?.name || 'N/A'}\nEmail: ${user?.email || 'N/A'}\nRôle: ${roleConfig.label}\nVersion: ${APP_VERSION}\n\nDescription du problème:\n\n`
    );
    
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    
    try {
      if (Platform.OS === 'web') {
        window.open(mailtoUrl, '_blank');
      } else {
        const canOpen = await Linking.canOpenURL(mailtoUrl);
        if (canOpen) {
          await Linking.openURL(mailtoUrl);
        } else {
          Alert.alert('Support', `Email: ${SUPPORT_EMAIL}\nTél: ${SUPPORT_PHONE}`);
        }
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert(`Email: ${SUPPORT_EMAIL}\nTél: ${SUPPORT_PHONE}`);
      } else {
        Alert.alert('Support', `Email: ${SUPPORT_EMAIL}\nTél: ${SUPPORT_PHONE}`);
      }
    }
  };

  const getGuideContent = () => {
    const guides: Record<string, { title: string; sections: { title: string; content: string; icon: string }[] }> = {
      'AGENT_CONTROLE': {
        title: 'Guide Agent de Contrôle',
        sections: [
          { icon: 'plus-circle', title: 'Créer une tournée', content: 'Appuyez sur "+" pour créer une nouvelle tournée. Sélectionnez le chauffeur, secteur, matricule et nombre de caisses.' },
          { icon: 'keyboard-return', title: 'Gérer les retours', content: 'Sélectionnez une tournée en retour, comptez les caisses, prenez une photo et indiquez les produits poulet.' },
          { icon: 'alert-circle', title: 'Conflits', content: 'Un conflit est créé automatiquement si la différence dépasse la tolérance. La direction sera notifiée.' }
        ]
      },
      'AGENT_HYGIENE': {
        title: 'Guide Agent Hygiène',
        sections: [
          { icon: 'eye', title: 'Inspecter', content: 'Sélectionnez une tournée en attente d\'hygiène pour l\'inspecter.' },
          { icon: 'camera', title: 'Documenter', content: 'Prenez plusieurs photos du matériel retourné pour documenter l\'état.' },
          { icon: 'check-circle', title: 'Valider', content: 'Approuvez si propre, ou rejetez pour demander un nettoyage supplémentaire.' }
        ]
      },
      'SECURITE': {
        title: isSecurite ? AR.guideTitle : 'Guide Sécurité',
        sections: isSecurite ? [
          { icon: 'scale', title: AR.exitWeighing, content: AR.exitWeighingDesc },
          { icon: 'scale', title: AR.entryWeighing, content: AR.entryWeighingDesc },
          { icon: 'car', title: AR.plateFormat, content: AR.plateFormatDesc }
        ] : [
          { icon: 'scale', title: 'Pesée sortie', content: 'Recherchez le véhicule par matricule et entrez le poids brut avant départ.' },
          { icon: 'scale', title: 'Pesée entrée', content: 'Au retour, pesez à nouveau le véhicule et enregistrez le poids.' },
          { icon: 'car', title: 'Format matricule', content: 'Format tunisien: XXX تونس XXXX (ex: 238 تونس 8008).' }
        ]
      },
      'DIRECTION': {
        title: 'Guide Direction',
        sections: [
          { icon: 'view-dashboard', title: 'Dashboard', content: 'Consultez les KPIs: tournées actives, caisses dehors, conflits ouverts.' },
          { icon: 'alert-circle', title: 'Conflits', content: 'Gérez les conflits de caisses. Consultez l\'historique du chauffeur avant de décider.' },
          { icon: 'truck', title: 'Suivi', content: 'Suivez toutes les tournées en temps réel avec leur statut.' }
        ]
      }
    };
    return guides[user?.role || ''] || {
      title: 'Guide d\'utilisation',
      sections: [
        { icon: 'navigation', title: 'Navigation', content: 'Utilisez les onglets en bas pour naviguer.' },
        { icon: 'help-circle', title: 'Aide', content: 'Contactez le support pour toute question.' }
      ]
    };
  };

  const MenuItem = ({ icon, title, subtitle, onPress, showArrow = true, danger = false, rtl = false }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    danger?: boolean;
    rtl?: boolean;
  }) => (
    <TouchableOpacity 
      style={[styles.menuItem, rtl && styles.menuItemRtl]} 
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {!rtl && (
        <View style={[styles.menuIconContainer, danger && styles.menuIconDanger]}>
          <MaterialCommunityIcons 
            name={icon as any} 
            size={22} 
            color={danger ? '#F44336' : roleConfig.colors[0]} 
          />
        </View>
      )}
      <View style={[styles.menuContent, rtl && styles.menuContentRtl]}>
        <Text style={[styles.menuTitle, danger && styles.menuTitleDanger, rtl && styles.rtlText]}>{title}</Text>
        {subtitle && <Text style={[styles.menuSubtitle, rtl && styles.rtlText]}>{subtitle}</Text>}
      </View>
      {rtl && (
        <View style={[styles.menuIconContainer, danger && styles.menuIconDanger, styles.menuIconRtl]}>
          <MaterialCommunityIcons 
            name={icon as any} 
            size={22} 
            color={danger ? '#F44336' : roleConfig.colors[0]} 
          />
        </View>
      )}
      {showArrow && onPress && !rtl && (
        <MaterialCommunityIcons name="chevron-right" size={22} color="#C0C0C0" />
      )}
      {showArrow && onPress && rtl && (
        <MaterialCommunityIcons name="chevron-left" size={22} color="#C0C0C0" />
      )}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, isSecurite && styles.sectionHeaderRtl]}>{title}</Text>
  );

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={roleConfig.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons name="factory" size={32} color="#fff" />
          </View>
          <Text style={styles.companyName}>{COMPANY_NAME}</Text>
          <Text style={[styles.companyTagline, isSecurite && styles.rtlText]}>{isSecurite ? AR.companyTagline : 'Gestion des Caisses'}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <Surface style={styles.profileCard} elevation={3}>
          <View style={[styles.profileHeader, isSecurite && styles.profileHeaderRtl]}>
            <View style={[styles.avatarContainer, { backgroundColor: roleConfig.lightBg }, isSecurite && styles.avatarContainerRtl]}>
              <MaterialCommunityIcons 
                name={roleConfig.icon as any} 
                size={36} 
                color={roleConfig.colors[0]} 
              />
            </View>
            <View style={[styles.profileInfo, isSecurite && styles.profileInfoRtl]}>
              <Text style={[styles.profileName, isSecurite && styles.rtlText]}>{user?.name || (isSecurite ? 'مستخدم' : 'Utilisateur')}</Text>
              <Text style={[styles.profileEmail, isSecurite && styles.rtlText]}>{user?.email || ''}</Text>
              <View style={[styles.roleBadge, { backgroundColor: roleConfig.lightBg }, isSecurite && styles.roleBadgeRtl]}>
                <MaterialCommunityIcons 
                  name={roleConfig.icon as any} 
                  size={14} 
                  color={roleConfig.colors[0]} 
                />
                <Text style={[styles.roleText, { color: roleConfig.colors[0] }, isSecurite && styles.roleTextRtl]}>
                  {roleConfig.label}
                </Text>
              </View>
            </View>
          </View>
        </Surface>

        {/* Account Section */}
        <SectionHeader title={isSecurite ? AR.account : 'COMPTE'} />
        <Surface style={styles.menuCard} elevation={1}>
          <MenuItem 
            icon="account-circle" 
            title={isSecurite ? AR.profile : 'Profil'} 
            subtitle={user?.name || (isSecurite ? AR.notDefined : 'Non défini')}
            showArrow={false}
            rtl={isSecurite}
          />
          <Divider style={styles.divider} />
          <MenuItem 
            icon="email" 
            title={isSecurite ? AR.email : 'Email'} 
            subtitle={user?.email || (isSecurite ? AR.notDefined : 'Non défini')}
            showArrow={false}
            rtl={isSecurite}
          />
          <Divider style={styles.divider} />
          <MenuItem 
            icon={roleConfig.icon} 
            title={isSecurite ? AR.role : 'Rôle'} 
            subtitle={roleConfig.label}
            showArrow={false}
            rtl={isSecurite}
          />
        </Surface>

        {/* Application Section */}
        <SectionHeader title={isSecurite ? AR.application : 'APPLICATION'} />
        <Surface style={styles.menuCard} elevation={1}>
          <MenuItem 
            icon="information" 
            title={isSecurite ? AR.version : 'Version'} 
            subtitle={APP_VERSION}
            showArrow={false}
            rtl={isSecurite}
          />
          <Divider style={styles.divider} />
          <MenuItem 
            icon="cellphone" 
            title={isSecurite ? AR.platform : 'Plateforme'} 
            subtitle={Platform.OS === 'web' ? (isSecurite ? AR.web : 'Web') : Platform.OS === 'ios' ? 'iOS' : 'Android'}
            showArrow={false}
            rtl={isSecurite}
          />
        </Surface>

        {/* Support Section */}
        <SectionHeader title={isSecurite ? AR.helpSupport : 'AIDE & SUPPORT'} />
        <Surface style={styles.menuCard} elevation={1}>
          <MenuItem 
            icon="help-circle" 
            title={isSecurite ? AR.technicalSupport : 'Support technique'} 
            subtitle={isSecurite ? AR.contactTeam : "Contacter l'équipe"}
            onPress={handleSupportEmail}
            rtl={isSecurite}
          />
          <Divider style={styles.divider} />
          <MenuItem 
            icon="book-open-variant" 
            title={isSecurite ? AR.userGuide : "Guide d'utilisation"} 
            subtitle={isSecurite ? AR.viewManual : 'Consulter le manuel'}
            onPress={() => setShowGuideModal(true)}
            rtl={isSecurite}
          />
          <Divider style={styles.divider} />
          <MenuItem 
            icon="phone" 
            title={isSecurite ? AR.phone : 'Téléphone'} 
            subtitle={SUPPORT_PHONE}
            showArrow={false}
            rtl={isSecurite}
          />
        </Surface>

        {/* Logout */}
        <Surface style={[styles.menuCard, styles.logoutCard]} elevation={1}>
          <MenuItem 
            icon="logout" 
            title={isSecurite ? AR.logout : 'Déconnexion'} 
            onPress={handleLogout}
            showArrow={false}
            danger
            rtl={isSecurite}
          />
        </Surface>

        {/* Footer */}
        <View style={[styles.footer, isSecurite && styles.footerRtl]}>
          <View style={[styles.footerLogo, isSecurite && styles.footerLogoRtl]}>
            <MaterialCommunityIcons name="factory" size={24} color="#9E9E9E" />
            <Text style={[styles.footerCompany, isSecurite && styles.footerCompanyRtl]}>{COMPANY_NAME}</Text>
          </View>
          <Text style={[styles.footerCopyright, isSecurite && styles.rtlText]}>{isSecurite ? `${COMPANY_NAME} ${AR.copyright}` : `© 2025 ${COMPANY_NAME}`}</Text>
          <Text style={[styles.footerTagline, isSecurite && styles.rtlText]}>{isSecurite ? AR.professionalSolution : 'Solution Professionnelle de Gestion'}</Text>
        </View>
      </ScrollView>

      {/* Guide Modal */}
      <Portal>
        <Modal
          visible={showGuideModal}
          onDismiss={() => setShowGuideModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalContent} elevation={4}>
            <LinearGradient
              colors={roleConfig.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.modalHeader, isSecurite && styles.modalHeaderRtl]}
            >
              <MaterialCommunityIcons name="book-open-page-variant" size={28} color="#fff" />
              <Text style={[styles.modalTitle, isSecurite && styles.modalTitleRtl]}>{getGuideContent().title}</Text>
            </LinearGradient>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {getGuideContent().sections.map((section, index) => (
                <View key={index} style={[styles.guideSection, isSecurite && styles.guideSectionRtl]}>
                  <View style={[styles.guideSectionIcon, { backgroundColor: roleConfig.lightBg }, isSecurite && styles.guideSectionIconRtl]}>
                    <MaterialCommunityIcons 
                      name={section.icon as any} 
                      size={24} 
                      color={roleConfig.colors[0]} 
                    />
                  </View>
                  <View style={[styles.guideSectionContent, isSecurite && styles.guideSectionContentRtl]}>
                    <Text style={[styles.guideSectionTitle, isSecurite && styles.rtlText]}>{section.title}</Text>
                    <Text style={[styles.guideSectionText, isSecurite && styles.rtlText]}>{section.content}</Text>
                  </View>
                </View>
              ))}

              <View style={[styles.guideFooter, isSecurite && styles.guideFooterRtl]}>
                <MaterialCommunityIcons name="lightbulb-on" size={20} color="#FFA000" />
                <Text style={[styles.guideFooterText, isSecurite && styles.guideFooterTextRtl]}>
                  {isSecurite ? AR.moreHelp : 'Pour plus d\'aide, contactez le support technique.'}
                </Text>
              </View>
            </ScrollView>

            <Button
              mode="contained"
              onPress={() => setShowGuideModal(false)}
              style={styles.modalButton}
              buttonColor={roleConfig.colors[0]}
            >
              {isSecurite ? AR.understood : 'Compris'}
            </Button>
          </Surface>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  companyName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  companyTagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  content: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  profileCard: {
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9E9E9E',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIconDanger: {
    backgroundColor: '#FFEBEE',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  menuTitleDanger: {
    color: '#F44336',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#9E9E9E',
    marginTop: 2,
  },
  divider: {
    marginLeft: 68,
  },
  logoutCard: {
    marginTop: 20,
  },
  // RTL styles for SECURITE
  rtlText: {
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif',
  },
  menuItemRtl: {
    flexDirection: 'row-reverse',
  },
  menuContentRtl: {
    alignItems: 'flex-end',
  },
  menuIconRtl: {
    marginRight: 0,
    marginLeft: 12,
  },
  sectionHeaderRtl: {
    textAlign: 'right',
    marginRight: 4,
    marginLeft: 0,
  },
  // Profile RTL styles
  profileHeaderRtl: {
    flexDirection: 'row-reverse',
  },
  avatarContainerRtl: {
    marginRight: 0,
    marginLeft: 16,
  },
  profileInfoRtl: {
    alignItems: 'flex-end',
  },
  roleBadgeRtl: {
    flexDirection: 'row-reverse',
    alignSelf: 'flex-end',
  },
  roleTextRtl: {
    marginLeft: 0,
    marginRight: 4,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingBottom: 50,
  },
  footerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  footerCompany: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9E9E9E',
    marginLeft: 6,
  },
  footerCopyright: {
    fontSize: 12,
    color: '#BDBDBD',
  },
  footerTagline: {
    fontSize: 11,
    color: '#BDBDBD',
    marginTop: 2,
  },
  // Footer RTL styles
  footerRtl: {
    alignItems: 'center',
  },
  footerLogoRtl: {
    flexDirection: 'row-reverse',
  },
  footerCompanyRtl: {
    marginLeft: 0,
    marginRight: 6,
  },
  modalContainer: {
    margin: 16,
  },
  modalContent: {
    borderRadius: 20,
    backgroundColor: '#fff',
    overflow: 'hidden',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  modalScroll: {
    maxHeight: 400,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  guideSection: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  guideSectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  guideSectionContent: {
    flex: 1,
  },
  guideSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  guideSectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  guideFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  guideFooterText: {
    fontSize: 13,
    color: '#F57C00',
    marginLeft: 10,
    flex: 1,
  },
  // Modal RTL styles
  modalHeaderRtl: {
    flexDirection: 'row-reverse',
  },
  modalTitleRtl: {
    marginLeft: 0,
    marginRight: 10,
    textAlign: 'right',
  },
  // Guide section RTL styles
  guideSectionRtl: {
    flexDirection: 'row-reverse',
  },
  guideSectionIconRtl: {
    marginRight: 0,
    marginLeft: 12,
  },
  guideSectionContentRtl: {
    alignItems: 'flex-end',
  },
  guideFooterRtl: {
    flexDirection: 'row-reverse',
  },
  guideFooterTextRtl: {
    marginLeft: 0,
    marginRight: 10,
    textAlign: 'right',
  },
  modalButton: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
  },
});
