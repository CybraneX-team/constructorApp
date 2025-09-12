import React, { useEffect, useMemo, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../utils/apiConfig';
import { useAuth } from '../contexts/AuthContext';

interface AdminDayLogItem {
  id: string;
  date?: string;
  site?: string;
  created_by?: string;
  contributors?: string[];
  updated_at?: number;
}

const AdminSiteRecordings: React.FC = () => {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false, title: 'Site Recordings' });
  }, [navigation]);

  const params = useLocalSearchParams();
  const siteId = useMemo(() => (params?.id ? String(params.id) : ''), [params]);
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AdminDayLogItem[]>([]);

  useEffect(() => {
    if (!siteId) return;
    loadList();
  }, [siteId]);

  const loadList = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = `${API_BASE_URL}/admin/recordings?site=${encodeURIComponent(siteId)}&page=1&limit=50`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Failed to load recordings: ${res.status}`);
      const data = await res.json();
      // Expecting something like { items: [...] } or array; normalize
      const list: AdminDayLogItem[] = data?.items || data?.records || data || [];
      setItems(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadList();
    setRefreshing(false);
  };

  const openSummary = async (id: string) => {
    router.push({ pathname: '/admin-site-summary', params: { id, site: siteId } });
  };

  const renderItem = ({ item }: { item: AdminDayLogItem }) => {
    const contributors = item.contributors && item.contributors.length > 0
      ? item.contributors.join(', ')
      : (item.created_by || 'Unknown');
    const dateText = item.date ? new Date(item.date).toLocaleDateString() : (item.updated_at ? new Date(item.updated_at).toLocaleString() : '');
    return (
      <TouchableOpacity onPress={() => openSummary(item.id)} activeOpacity={0.8}>
        <View style={styles.card}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardTitle}>Consolidated Recording</Text>
            {!!dateText && <Text style={styles.cardSubtitle}>{dateText}</Text>}
            <Text style={styles.cardContrib}>Contributors: {contributors}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading recordings…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="warning-outline" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={loadList} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Site Recordings</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="documents-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyTitle}>No recordings found</Text>
            <Text style={styles.emptySub}>This site has no consolidated recording yet.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#8E8E93' },
  errorText: { marginTop: 12, color: '#FF3B30' },
  retryBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#007AFF' },
  retryText: { color: '#fff', fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  listContent: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EEE' },
  cardLeft: { flex: 1, paddingRight: 10 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#000' },
  cardSubtitle: { marginTop: 4, fontSize: 13, color: '#8E8E93' },
  cardContrib: { marginTop: 6, fontSize: 13, color: '#333' },
  empty: { alignItems: 'center', paddingTop: 48 },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: '600', color: '#8E8E93' },
  emptySub: { marginTop: 6, fontSize: 14, color: '#8E8E93' },
});

export default AdminSiteRecordings;
