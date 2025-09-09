import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { customAlert } from '../services/customAlertService';
import { API_BASE_URL } from '../utils/apiConfig';

interface Site {
  id: string;
  name: string;
  address: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface SiteFormData {
  name: string;
  address: string;
  description: string;
}

const AdminPanel: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [formData, setFormData] = useState<SiteFormData>({
    name: '',
    address: '',
    description: '',
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      customAlert.error('Access Denied', 'You do not have admin privileges');
      router.replace('/site-selection');
      return;
    }
    loadSites();
  }, [user]);

  const loadSites = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin/sites`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load sites: ${response.status}`);
      }

      const data = await response.json();
      setSites(data.sites || []);
    } catch (error) {
      console.error('Error loading sites:', error);
      customAlert.error('Error', 'Failed to load sites. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSites();
    setRefreshing(false);
  };

  const handleAddSite = async () => {
    if (!formData.name.trim() || !formData.address.trim()) {
      customAlert.error('Error', 'Please fill in site name and address');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/sites`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create site: ${response.status}`);
      }

      const newSite = await response.json();
      setSites([...sites, newSite.site]);
      setShowAddModal(false);
      setFormData({ name: '', address: '', description: '' });
      customAlert.success('Success', 'Site created successfully!');
    } catch (error) {
      console.error('Error creating site:', error);
      customAlert.error('Error', 'Failed to create site. Please try again.');
    }
  };

  const handleEditSite = async () => {
    if (!editingSite || !formData.name.trim() || !formData.address.trim()) {
      customAlert.error('Error', 'Please fill in site name and address');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/sites/${editingSite.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update site: ${response.status}`);
      }

      const updatedSite = await response.json();
      setSites(sites.map(site => 
        site.id === editingSite.id ? updatedSite.site : site
      ));
      setShowEditModal(false);
      setEditingSite(null);
      setFormData({ name: '', address: '', description: '' });
      customAlert.success('Success', 'Site updated successfully!');
    } catch (error) {
      console.error('Error updating site:', error);
      customAlert.error('Error', 'Failed to update site. Please try again.');
    }
  };

  const handleDeleteSite = (site: Site) => {
    Alert.alert(
      'Delete Site',
      `Are you sure you want to delete "${site.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/admin/sites/${site.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (!response.ok) {
                throw new Error(`Failed to delete site: ${response.status}`);
              }

              setSites(sites.filter(s => s.id !== site.id));
              customAlert.success('Success', 'Site deleted successfully!');
            } catch (error) {
              console.error('Error deleting site:', error);
              customAlert.error('Error', 'Failed to delete site. Please try again.');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (site: Site) => {
    setEditingSite(site);
    setFormData({
      name: site.name,
      address: site.address,
      description: site.description || '',
    });
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingSite(null);
    setFormData({ name: '', address: '', description: '' });
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const renderSiteItem = ({ item }: { item: Site }) => (
    <View style={styles.siteCard}>
      <View style={styles.siteInfo}>
        <Text style={styles.siteName}>{item.name}</Text>
        <Text style={styles.siteAddress}>{item.address}</Text>
        {item.description && (
          <Text style={styles.siteDescription}>{item.description}</Text>
        )}
        <Text style={styles.siteDate}>
          Created: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.siteActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={20} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteSite(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderModal = () => (
    <Modal
      visible={showAddModal || showEditModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closeModals}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {showAddModal ? 'Add New Site' : 'Edit Site'}
          </Text>
          <TouchableOpacity onPress={closeModals} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Site Name *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter site name"
              placeholderTextColor="#8E8E93"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Address *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="Enter site address"
              placeholderTextColor="#8E8E93"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Enter site description (optional)"
              placeholderTextColor="#8E8E93"
              multiline
              numberOfLines={4}
            />
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={closeModals}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.saveButton]}
            onPress={showAddModal ? handleAddSite : handleEditSite}
          >
            <Text style={styles.saveButtonText}>
              {showAddModal ? 'Create Site' : 'Update Site'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading sites...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <Text style={styles.headerSubtitle}>Manage Sites</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{sites.length}</Text>
          <Text style={styles.statLabel}>Total Sites</Text>
        </View>
      </View>

      <FlatList
        data={sites}
        keyExtractor={(item) => item.id}
        renderItem={renderSiteItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyTitle}>No Sites Found</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button to add your first site
            </Text>
          </View>
        }
      />

      {renderModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  siteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  siteInfo: {
    flex: 1,
  },
  siteName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  siteAddress: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  siteDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  siteDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  siteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AdminPanel;

