import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { useSite, Site } from '../contexts/SiteContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axiosInstance from '../utils/axiosConfig';

const { width, height } = Dimensions.get('window');

const SiteSelectionScreen: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Create site form states
  const [siteName, setSiteName] = useState('');
  const [siteId, setSiteId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [stakeholdersText, setStakeholdersText] = useState('');
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const { user, logout } = useAuth();
  const { sites, setSites, setSelectedSite, addSite, isLoading: isLoadingSites } = useSite();

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;
  const buttonScale = React.useRef(new Animated.Value(1)).current;
  const modalScale = React.useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    fadeAnim.setValue(1);
    slideAnim.setValue(0);
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    loadActiveSites();
  }, []);

  const loadActiveSites = async () => {
    try {
      const response = await axiosInstance.get('/sites');
      
      if (response.data.success) {
        setSites(response.data.sites || []);
      } else {
        console.error('Failed to load sites:', response.data.error);
        Alert.alert('Error', 'Failed to load sites');
      }
    } catch (error: any) {
      console.error('Error loading sites:', error);
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please log in again');
        logout();
      } else if (error.response?.status === 403) {
        Alert.alert('Access Denied', 'You do not have permission to access this resource.');
      } else {
        Alert.alert('Error', 'Failed to load sites. Please try again.');
      }
    }
  };

  const handleSiteSelect = (site: Site) => {
    // Store selected site in context
    setSelectedSite(site);
    console.log('Selected site:', site);
    router.replace('/main');
  };

  const handleCreateSite = async () => {
    if (!siteName || !siteId || !companyName || !stakeholdersText) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Parse stakeholders emails
    const stakeholders = stakeholdersText
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = stakeholders.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
      Alert.alert('Error', `Invalid email addresses: ${invalidEmails.join(', ')}`);
      return;
    }

    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();

    setIsLoading(true);
    try {
      const response = await axiosInstance.post('/sites', {
        name: siteName,
        siteId: siteId,
        companyName: companyName,
        stakeholders: stakeholders,
      });

      if (response.data.success) {
        // Use context method to add the new site
        addSite(response.data.site);
        setShowCreateForm(false);
        
        // Reset form
        setSiteName('');
        setSiteId('');
        setCompanyName('');
        setStakeholdersText('');
        
        Alert.alert('Success', 'Site created successfully!');
      } else {
        Alert.alert('Error', response.data.error || 'Failed to create site');
      }
    } catch (error: any) {
      console.error('Error creating site:', error);
      if (error.response?.status === 401) {
        Alert.alert('Session Expired', 'Please log in again');
        logout();
      } else if (error.response?.data?.error) {
        Alert.alert('Error', error.response.data.error);
      } else {
        Alert.alert('Error', 'Failed to create site. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateForm = () => {
    setShowCreateForm(true);
    Animated.timing(modalScale, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeCreateForm = () => {
    Animated.timing(modalScale, {
      toValue: 0.8,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowCreateForm(false);
      setSiteName('');
      setSiteId('');
      setCompanyName('');
      setStakeholdersText('');
    });
  };

  const renderSiteItem = ({ item }: { item: Site }) => (
    <TouchableOpacity
      style={styles.siteCard}
      onPress={() => handleSiteSelect(item)}
      activeOpacity={0.8}
    >
      <View style={styles.siteHeader}>
        <View style={styles.siteIconContainer}>
          <LinearGradient
            colors={[Colors.light.new, Colors.light.new + 'CC']}
            style={styles.siteIconGradient}
          >
            <Ionicons name="business" size={24} color="white" />
          </LinearGradient>
        </View>
        <View style={styles.siteInfo}>
          <Text style={styles.siteName}>{item.name}</Text>
          <Text style={styles.siteId}>ID: {item.siteId}</Text>
          <Text style={styles.companyName}>{item.companyName}</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={Colors.light.icon + '60'} />
      </View>
      <View style={styles.stakeholdersList}>
        <Text style={styles.stakeholdersLabel}>Stakeholders:</Text>
        <Text style={styles.stakeholdersText}>
          {item.stakeholders.slice(0, 2).join(', ')}
          {item.stakeholders.length > 2 && ` +${item.stakeholders.length - 2} more`}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.light.tint} />
      
      {/* Enhanced Background Gradient */}
      <LinearGradient
        colors={[Colors.light.tint + '20', Colors.light.tint + '05', '#f8fafc']}
        style={styles.backgroundGradient}
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <Animated.View 
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Enhanced Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[Platform.OS === 'ios' ? '#000' : Colors.light.new, Platform.OS === 'ios' ? '#000' : Colors.light.new + 'CC']}
                style={styles.logoGradient}
              >
                <Ionicons name="location" size={50} color="white" />
              </LinearGradient>
            </View>
            <Text style={styles.title}>Select Site</Text>
            <Text style={styles.subtitle}>
              Choose a site to continue or create a new one
            </Text>
          </View>

          {/* User Info Section */}
          <View style={styles.userInfo}>
            {/* <Text style={styles.welcomeText}>Welcome</Text> */}
            <TouchableOpacity
              onPress={logout}
              style={styles.logoutButton}
              activeOpacity={0.7}
            >
              <Text style={styles.logoutText}>Logout</Text>
              <Ionicons name="log-out-outline" size={16} color={Colors.light.new} />
            </TouchableOpacity>
          </View>

          {/* Sites List */}
          <View style={styles.sitesContainer}>
            <Text style={styles.sectionTitle}>Active Sites</Text>
            
            {isLoadingSites ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.light.new} />
                <Text style={styles.loadingText}>Loading sites...</Text>
              </View>
            ) : sites.length > 0 ? (
              <FlatList
                data={sites}
                renderItem={renderSiteItem}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sitesList}
                style={styles.flatListStyle}
              />
            ) : (
              <View style={styles.emptySites}>
                <Ionicons name="business-outline" size={64} color={Colors.light.icon + '40'} />
                <Text style={styles.emptyText}>No active sites found</Text>
                <Text style={styles.emptySubtext}>Create your first site to get started</Text>
              </View>
            )}
          </View>

          {/* Create New Site Button */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={openCreateForm}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[Platform.OS === 'ios' ? '#000' : Colors.light.new, Platform.OS === 'ios' ? '#000' : Colors.light.new + 'CC']}
              style={styles.buttonGradient}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="add" size={24} color="white" />
                <Text style={styles.createButtonText}>Create New Site</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Create Site Modal */}
      <Modal
        visible={showCreateForm}
        transparent={true}
        animationType="fade"
        onRequestClose={closeCreateForm}
      >
        <View style={styles.modalBackdrop}>
          <Animated.View 
            style={[
              styles.modalContainer,
              { transform: [{ scale: modalScale }] }
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={closeCreateForm}
                  style={styles.closeButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color={Colors.light.icon} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Create New Site</Text>
                <Text style={styles.modalSubtitle}>Fill in the details below</Text>
              </View>

              {/* Form Inputs */}
              <View style={styles.inputContainer}>
                <View style={[
                  styles.inputWrapper,
                  focusedInput === 'siteName' && styles.focusedInput
                ]}>
                  <Ionicons name="business-outline" size={22} color={Colors.light.icon} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Site Name"
                    placeholderTextColor={Colors.light.icon + '80'}
                    value={siteName}
                    onChangeText={setSiteName}
                    autoCapitalize="words"
                    selectTextOnFocus={true}
                    clearButtonMode="while-editing"
                    onFocus={() => setFocusedInput('siteName')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>

                <View style={[
                  styles.inputWrapper,
                  focusedInput === 'siteId' && styles.focusedInput
                ]}>
                  <Ionicons name="barcode-outline" size={22} color={Colors.light.icon} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Site ID"
                    placeholderTextColor={Colors.light.icon + '80'}
                    value={siteId}
                    onChangeText={setSiteId}
                    autoCapitalize="characters"
                    selectTextOnFocus={true}
                    clearButtonMode="while-editing"
                    onFocus={() => setFocusedInput('siteId')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>

                <View style={[
                  styles.inputWrapper,
                  focusedInput === 'companyName' && styles.focusedInput
                ]}>
                  <Ionicons name="briefcase-outline" size={22} color={Colors.light.icon} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Company Name"
                    placeholderTextColor={Colors.light.icon + '80'}
                    value={companyName}
                    onChangeText={setCompanyName}
                    autoCapitalize="words"
                    selectTextOnFocus={true}
                    clearButtonMode="while-editing"
                    onFocus={() => setFocusedInput('companyName')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>

                <View style={[
                  styles.inputWrapper,
                  styles.textareaWrapper,
                  focusedInput === 'stakeholders' && styles.focusedInput
                ]}>
                  <Ionicons name="people-outline" size={22} color={Colors.light.icon} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    placeholder="Stakeholder emails (comma-separated)&#10;e.g. john@company.com, sarah@company.com"
                    placeholderTextColor={Colors.light.icon + '80'}
                    value={stakeholdersText}
                    onChangeText={setStakeholdersText}
                    multiline={true}
                    numberOfLines={4}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    selectTextOnFocus={true}
                    onFocus={() => setFocusedInput('stakeholders')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </View>

              {/* Form Actions */}
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeCreateForm}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.disabledButton]}
                    onPress={handleCreateSite}
                    disabled={isLoading}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={[Platform.OS === 'ios' ? '#000' : Colors.light.new, Platform.OS === 'ios' ? '#000' : Colors.light.new + 'CC']}
                      style={styles.submitButtonGradient}
                    >
                      {isLoading ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator color="white" size="small" />
                          <Text style={styles.loadingButtonText}>Creating...</Text>
                        </View>
                      ) : (
                        <View style={styles.buttonContent}>
                          <Text style={styles.submitButtonText}>Create Site</Text>
                          <Ionicons name="checkmark" size={20} color="white" style={{marginRight: 10}}/>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    minHeight: height - 100,
  },
  formContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 36,
    margin: 24,
    marginTop: 60,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 15,
    },
    shadowOpacity: 0.12,
    shadowRadius: 25,
    elevation: 15,
    borderWidth: 1,
    borderColor: '#000',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 20,
    shadowColor: Colors.light.new,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  userInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.new,
  },
  sitesContainer: {
    flex: 1,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  sitesList: {
    gap: 12,
  },
  flatListStyle: {
    flex: 1,
  },
  siteCard: {
    backgroundColor: '#fafbfc',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  siteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  siteIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  siteIconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  siteInfo: {
    flex: 1,
  },
  siteName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  siteId: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 2,
  },
  companyName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.new,
  },
  stakeholdersList: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  stakeholdersLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  stakeholdersText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  emptySites: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  createButton: {
    borderRadius: 20,
    shadowColor: Colors.light.new,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  buttonGradient: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 28,
    width: '100%',
    maxHeight: height * 0.8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
  },
  modalScrollContent: {
    padding: 36,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  closeButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    padding: 12,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  inputContainer: {
    gap: 20,
    marginBottom: 28,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    backgroundColor: '#fafbfc',
    paddingHorizontal: 18,
    minHeight: 64,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  textareaWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 18,
  },
  focusedInput: {
    borderColor: Colors.light.tint,
    backgroundColor: 'white',
    shadowColor: Colors.light.tint,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  inputIcon: {
    marginRight: 16,
    marginTop: 21,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    paddingVertical: 21,
  },
  textarea: {
    paddingVertical: 0,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
  },
  submitButton: {
    flex: 1,
    borderRadius: 16,
    shadowColor: Colors.light.new,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  submitButtonGradient: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    paddingLeft: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loadingButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default SiteSelectionScreen;
