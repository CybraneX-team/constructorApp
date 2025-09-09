import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  BackHandler,
  Vibration,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { customAlert } from '../services/customAlertService';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSite, Site } from '../contexts/SiteContext';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/Colors';
import { siteService } from '../services/siteService';

interface SiteDetailModalProps {
  visible: boolean;
  siteId: string;
  onClose: () => void;
  modalScale?: any;
  modalOpacity?: any;
  backdropOpacity?: any;
}

// Helper function for cross-platform back navigation haptic feedback
const triggerBackHaptic = () => {
  if (Platform.OS === 'ios') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } else if (Platform.OS === 'android') {
    Vibration.vibrate(30); // Short vibration for back navigation
  }
};

const SiteDetailModal: React.FC<SiteDetailModalProps> = ({
  visible,
  siteId,
  onClose,
  modalScale,
  modalOpacity,
  backdropOpacity,
}) => {
  const { logout } = useAuth();
  const { sites, setSites } = useSite();
  const [site, setSite] = useState<Site | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [siteIdForm, setSiteIdForm] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [stakeholdersText, setStakeholdersText] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Handle back button for Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible) {
        triggerBackHaptic();
        onClose();
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior
    });

    return () => backHandler.remove();
  }, [visible, onClose]);

  useEffect(() => {
    if (visible && siteId) {
      loadSiteDetails();
    }
  }, [visible, siteId]);

  const loadSiteDetails = async () => {
    try {
      setIsLoading(true);
      const response = await siteService.getSiteById(siteId);
      
      if (response.id) {
        const siteData = response;
        setSite(siteData);
        
        // Populate form fields
        setName(siteData.name);
        setSiteIdForm(siteData.site_id);
        setCompanyName(siteData.company_name);
        setStakeholdersText(siteData.stakeholders.join(', '));
        setIsActive(siteData.is_active);
      } else {
        customAlert.error('Error', 'Failed to load site details');
        onClose();
      }
    } catch (error: any) {
      console.error('Error loading site details:', error);
      if (error.response?.status === 401) {
        customAlert.error('Session Expired', 'Please log in again');
        logout();
      } else if (error.response?.status === 404) {
        customAlert.error('Not Found', 'Site not found');
        onClose();
      } else {
        customAlert.error('Error', 'Failed to load site details');
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name || !siteIdForm || !companyName) {
      customAlert.error('Error', 'Please fill in all required fields');
      return;
    }

    // Parse and validate stakeholders emails using the service
    const stakeholders = siteService.parseStakeholderEmails(stakeholdersText);
    const { valid, invalid } = siteService.validateStakeholderEmails(stakeholders);
    
    if (invalid.length > 0) {
      customAlert.error('Error', `Invalid email addresses: ${invalid.join(', ')}`);
      return;
    }

    try {
      setIsSaving(true);
      const response = await siteService.updateSite(siteId, {
        name,
        site_id: siteIdForm,
        company_name: companyName,
        stakeholders: valid,
        is_active: isActive,
      });

      if (response.id) {
        // Update local sites array
        const updatedSites = sites.map(s => 
          s.id === siteId 
            ? { ...s, name, site_id: siteIdForm, company_name: companyName, stakeholders: valid, is_active: isActive }
            : s
        );
        setSites(updatedSites);
        
        setSite({ ...site!, name, site_id: siteIdForm, company_name: companyName, stakeholders: valid, is_active: isActive });
        setIsEditing(false);
        customAlert.success('Success', 'Site updated successfully!');
      } else {
        customAlert.error('Error', 'Failed to update site');
      }
    } catch (error: any) {
      console.error('Error updating site:', error);
      if (error.response?.status === 401) {
        customAlert.error('Session Expired', 'Please log in again');
        logout();
      } else if (error.response?.status === 403) {
        customAlert.error('Access Denied', 'You do not have permission to edit this site.');
      } else if (error.response?.data?.error) {
        customAlert.error('Error', error.response.data.error);
      } else {
        customAlert.error('Error', 'Failed to update site. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    customAlert.confirm(
      'Delete Site',
      'Are you sure you want to delete this site? This action cannot be undone.',
      confirmDelete,
      undefined,
      'Delete',
      'Cancel'
    );
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await siteService.deleteSite(siteId);

      // Rust backend returns empty response on successful delete
      // Remove from local sites array
      const updatedSites = sites.filter(s => s.id !== siteId);
      setSites(updatedSites);
      
      customAlert.success('Success', 'Site deleted successfully!', onClose);
    } catch (error: any) {
      console.error('Error deleting site:', error);
      if (error.response?.status === 401) {
        customAlert.error('Session Expired', 'Please log in again');
        logout();
      } else if (error.response?.status === 403) {
        customAlert.error('Access Denied', 'You do not have permission to delete this site.');
      } else if (error.response?.data?.error) {
        customAlert.error('Error', error.response.data.error);
      } else {
        customAlert.error('Error', 'Failed to delete site. Please try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBackdropPress = () => {
    onClose();
  };

  // Create animated styles for the modal
  const animatedModalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale?.value || 1 }],
    opacity: modalOpacity?.value || 1,
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity?.value || 0,
  }));

  if (!visible) return null;

  // Android: inline overlay instead of RN Modal to avoid glitches
  if (Platform.OS === 'android') {
    return (
      <View style={styles.inlineOverlay}>
        <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
          <TouchableOpacity 
            style={styles.backdropTouchable} 
            activeOpacity={1} 
            onPress={handleBackdropPress}
          />
        </Animated.View>
        <Animated.View 
          style={[styles.container, styles.androidContainer, animatedModalStyle]}
          pointerEvents="box-none"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>
                {isEditing ? 'Edit Site' : 'Site Details'}
              </Text>
              <Text style={styles.subtitle}>
                {site?.name || 'Loading...'}
              </Text>
            </View>
            <View style={styles.headerActions}>
              {!isEditing ? (
                <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
                  <MaterialIcons name="edit" size={24} color={Colors.light.new} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <View style={styles.contentContainer} pointerEvents="box-none">
            <ScrollView 
              style={styles.content} 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              scrollEventThrottle={16}
              bounces={true}
              onScrollBeginDrag={() => {}}
              onScrollEndDrag={() => {}}
              scrollEnabled={true}
              directionalLockEnabled={true}
              alwaysBounceVertical={false}
              automaticallyAdjustContentInsets={false}
            >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.light.new} />
                <Text style={styles.loadingText}>Loading site details...</Text>
              </View>
            ) : site ? (
              <>
                {/* Site Information */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Site Information</Text>
                  
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Site Name *</Text>
                    {isEditing ? (
                      <TextInput
                        style={styles.textInput}
                        value={name}
                        onChangeText={setName}
                        placeholder="Enter site name"
                        placeholderTextColor={Colors.light.text}
                      />
                    ) : (
                      <Text style={styles.fieldValue}>{site.name}</Text>
                    )}
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Site ID *</Text>
                    {isEditing ? (
                      <TextInput
                        style={styles.textInput}
                        value={siteIdForm}
                        onChangeText={setSiteIdForm}
                        placeholder="Enter site ID"
                        placeholderTextColor={Colors.light.text}
                      />
                    ) : (
                      <Text style={styles.fieldValue}>{site.site_id}</Text>
                    )}
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Company Name *</Text>
                    {isEditing ? (
                      <TextInput
                        style={styles.textInput}
                        value={companyName}
                        onChangeText={setCompanyName}
                        placeholder="Enter company name"
                        placeholderTextColor={Colors.light.text}
                      />
                    ) : (
                      <Text style={styles.fieldValue}>{site.company_name}</Text>
                    )}
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Status</Text>
                    {isEditing ? (
                      <TouchableOpacity
                        style={[styles.statusToggle, isActive && styles.statusActive]}
                        onPress={() => setIsActive(!isActive)}
                      >
                        <Text style={[styles.statusText, isActive && styles.statusTextActive]}>
                          {isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.statusBadge, site.is_active && styles.statusBadgeActive]}>
                        <Text style={[styles.statusBadgeText, site.is_active && styles.statusBadgeTextActive]}>
                          {site.is_active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Stakeholders */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Email Recipients (Stakeholders)</Text>
                  <Text style={styles.sectionSubtitle}>
                    These email addresses will receive daily work summaries
                  </Text>
                  
                  {isEditing ? (
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Email Addresses *</Text>
                      <TextInput
                        style={[styles.textInput, styles.textArea]}
                        value={stakeholdersText}
                        onChangeText={setStakeholdersText}
                        placeholder="Enter email addresses separated by commas"
                        placeholderTextColor={Colors.light.text}
                        multiline
                        numberOfLines={4}
                      />
                      <Text style={styles.fieldHint}>
                        Separate multiple email addresses with commas
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.stakeholdersList}>
                      {site.stakeholders.length > 0 ? (
                        site.stakeholders.map((email, index) => (
                          <View key={index} style={styles.stakeholderItem}>
                            <MaterialIcons name="email" size={16} color={Colors.light.text} />
                            <Text style={styles.stakeholderEmail}>{email}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.noStakeholders}>No email recipients configured</Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Metadata */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Site Details</Text>
                  
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Created</Text>
                    <Text style={styles.fieldValue}>
                      {site.created_at ? new Date(site.created_at).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Site ID</Text>
                    <Text style={styles.fieldValue}>{site.id}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                {isEditing && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                      onPress={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <MaterialIcons name="save" size={20} color="#FFFFFF" />
                          <Text style={styles.saveButtonText}>Save Changes</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Delete Button */}
                <View style={styles.deleteSection}>
                  <Text style={styles.deleteSectionTitle}>Danger Zone</Text>
                  <TouchableOpacity
                    style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
                    onPress={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialIcons name="delete" size={20} color="#FFFFFF" />
                        <Text style={styles.deleteButtonText}>Delete Site</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Site not found</Text>
              </View>
            )}
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    );
  }

  // iOS: Use Modal component
  return (
    <View style={styles.inlineOverlay}>
      <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
        <TouchableOpacity 
          style={styles.backdropTouchable} 
          activeOpacity={1} 
          onPress={handleBackdropPress}
        />
      </Animated.View>
      <Animated.View 
        style={[styles.container, animatedModalStyle]}
        pointerEvents="box-none"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>
              {isEditing ? 'Edit Site' : 'Site Details'}
            </Text>
            <Text style={styles.subtitle}>
              {site?.name || 'Loading...'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {!isEditing ? (
              <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
                <MaterialIcons name="edit" size={24} color={Colors.light.new} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentContainer} pointerEvents="box-none">
          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            scrollEventThrottle={16}
            bounces={true}
            onScrollBeginDrag={() => {}}
            onScrollEndDrag={() => {}}
            scrollEnabled={true}
            directionalLockEnabled={true}
            alwaysBounceVertical={false}
            automaticallyAdjustContentInsets={false}
          >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.light.new} />
              <Text style={styles.loadingText}>Loading site details...</Text>
            </View>
          ) : site ? (
            <>
              {/* Site Information */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Site Information</Text>
                
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Site Name *</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.textInput}
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter site name"
                      placeholderTextColor={Colors.light.text}
                    />
                  ) : (
                    <Text style={styles.fieldValue}>{site.name}</Text>
                  )}
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Site ID *</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.textInput}
                      value={siteIdForm}
                      onChangeText={setSiteIdForm}
                      placeholder="Enter site ID"
                      placeholderTextColor={Colors.light.text}
                    />
                  ) : (
                    <Text style={styles.fieldValue}>{site.site_id}</Text>
                  )}
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Company Name *</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.textInput}
                      value={companyName}
                      onChangeText={setCompanyName}
                      placeholder="Enter company name"
                      placeholderTextColor={Colors.light.text}
                    />
                  ) : (
                    <Text style={styles.fieldValue}>{site.company_name}</Text>
                  )}
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Status</Text>
                  {isEditing ? (
                    <TouchableOpacity
                      style={[styles.statusToggle, isActive && styles.statusActive]}
                      onPress={() => setIsActive(!isActive)}
                    >
                      <Text style={[styles.statusText, isActive && styles.statusTextActive]}>
                        {isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.statusBadge, site.is_active && styles.statusBadgeActive]}>
                      <Text style={[styles.statusBadgeText, site.is_active && styles.statusBadgeTextActive]}>
                        {site.is_active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Stakeholders */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Email Recipients (Stakeholders)</Text>
                <Text style={styles.sectionSubtitle}>
                  These email addresses will receive daily work summaries
                </Text>
                
                {isEditing ? (
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Email Addresses *</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={stakeholdersText}
                      onChangeText={setStakeholdersText}
                      placeholder="Enter email addresses separated by commas"
                      placeholderTextColor={Colors.light.text}
                      multiline
                      numberOfLines={4}
                    />
                    <Text style={styles.fieldHint}>
                      Separate multiple email addresses with commas
                    </Text>
                  </View>
                ) : (
                  <View style={styles.stakeholdersList}>
                    {site.stakeholders.length > 0 ? (
                      site.stakeholders.map((email, index) => (
                        <View key={index} style={styles.stakeholderItem}>
                          <MaterialIcons name="email" size={16} color={Colors.light.text} />
                          <Text style={styles.stakeholderEmail}>{email}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noStakeholders}>No email recipients configured</Text>
                    )}
                  </View>
                )}
              </View>

              {/* Metadata */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Site Details</Text>
                
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Created</Text>
                  <Text style={styles.fieldValue}>
                    {site.created_at ? new Date(site.created_at).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Site ID</Text>
                  <Text style={styles.fieldValue}>{site.id}</Text>
                </View>
              </View>

              {/* Action Buttons */}
              {isEditing && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialIcons name="save" size={20} color="#FFFFFF" />
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Delete Button */}
              <View style={styles.deleteSection}>
                <Text style={styles.deleteSectionTitle}>Danger Zone</Text>
                <TouchableOpacity
                  style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
                  onPress={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialIcons name="delete" size={20} color="#FFFFFF" />
                      <Text style={styles.deleteButtonText}>Delete Site</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Site not found</Text>
            </View>
          )}
        </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  inlineOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
  },
  container: {
    position: 'absolute',
    top: '10%',
    left: 20,
    right: 20,
    bottom: '10%',
    backgroundColor: Colors.light.background,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  androidContainer: {
    top: '8%',
    bottom: '8%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: Colors.light.background, // Ensure header has background
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.text,
    opacity: 0.7,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  cancelButtonText: {
    color: Colors.light.new,
    fontSize: 16,
    fontWeight: '500',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  contentContainer: {
    flex: 1,
    minHeight: 0,
  },

  scrollContent: {
    paddingTop: 20,
    paddingBottom: 60,
    flexGrow: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.text,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 18,
    color: Colors.light.text,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 16,
    opacity: 0.7,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 16,
    color: Colors.light.text,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textInput: {
    fontSize: 16,
    color: Colors.light.text,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  fieldHint: {
    fontSize: 12,
    color: Colors.light.text,
    marginTop: 4,
    opacity: 0.7,
  },
  statusToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignSelf: 'flex-start',
  },
  statusActive: {
    backgroundColor: Colors.light.new,
    borderColor: Colors.light.new,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  statusTextActive: {
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignSelf: 'flex-start',
  },
  statusBadgeActive: {
    backgroundColor: '#10b98120',
    borderColor: '#10b981',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.text,
  },
  statusBadgeTextActive: {
    color: '#10b981',
  },
  stakeholdersList: {
    marginTop: 8,
  },
  stakeholderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stakeholderEmail: {
    fontSize: 14,
    color: Colors.light.text,
    marginLeft: 8,
    flex: 1,
  },
  noStakeholders: {
    fontSize: 14,
    color: Colors.light.text,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
    opacity: 0.7,
  },
  actionButtons: {
    marginTop: 16,
    marginBottom: 24,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.new,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  deleteSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default SiteDetailModal;