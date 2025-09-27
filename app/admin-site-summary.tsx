import React, { useEffect, useMemo, useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Linking, Image } from 'react-native';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { API_BASE_URL } from '../utils/apiConfig';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import EditModal, { EditModalProps } from '../components/EditModal';
import { 
  EditableLaborCard,
  EditableSubcontractorCard,
  EditableMaterialCard,
  EditableEquipmentCard,
} from '../components/EditableCards';
import { imageService } from '../services/imageService';
import { recordingService } from '../services/recordingService';
import { getRecordDate } from '../utils/dateFormatter';

interface AdminDayLog {
  id: string;
  site?: string;
  local_date?: string;
  recordings?: Array<{ url?: string; presignedUrl?: string; original_name?: string; download_url?: string; s3_presigned_url?: string }>;
  updated_at?: number;
  audio_url?: string;
}

function isNonEmptyString(v: any): boolean {
  return typeof v === 'string' && v.trim() !== '';
}

function hasMeaningfulObject(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  return Object.values(obj).some((val: any) => {
    if (val == null) return false;
    if (typeof val === 'string') return val.trim() !== '' && val !== '$-';
    if (typeof val === 'number') return val !== 0;
    if (typeof val === 'object') return hasMeaningfulObject(val);
    return false;
  });
}

function hasLaborRoleData(role: any): boolean {
  if (!role || typeof role !== 'object') return false;
  const fields = ['startTime','finishTime','hours','rate','total','start_time','finish_time'];
  return fields.some((f) => {
    const v = role[f];
    if (v == null) return false;
    if (typeof v === 'string') {
      const t = v.trim();
      if (f === 'hours' && /^0+(\.0+)?$/.test(t)) return false;
      if ((f === 'rate' || f === 'total') && t === '$-') return false;
      return t !== '';
    }
    if (typeof v === 'number') return v !== 0;
    return false;
  });
}

const AdminSiteSummary: React.FC = () => {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false, title: 'Recording Detail' });
  }, [navigation]);

  const params = useLocalSearchParams();
  const id = useMemo(() => (params?.id ? String(params.id) : ''), [params]);
  const site = useMemo(() => (params?.site ? String(params.site) : ''), [params]);
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dayLog, setDayLog] = useState<AdminDayLog | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [recordView, setRecordView] = useState<any>(null);
  const [editModal, setEditModal] = useState<{ visible: boolean; fieldType: EditModalProps['fieldType']; fieldLabel: string; fieldPath: string; initialValue: any; placeholder?: string; }>({ visible: false, fieldType: 'text', fieldLabel: '', fieldPath: '', initialValue: '' });

  useEffect(() => {
    if (!id || !site) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        // Fetch day log
        const logUrl = `${API_BASE_URL}/admin/recordings/${encodeURIComponent(id)}?site=${encodeURIComponent(site)}`;
        const logRes = await fetch(logUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (!logRes.ok) throw new Error(`Failed to load recording: ${logRes.status}`);
        const logData = await logRes.json();
        setDayLog(logData);

        // Fetch summary
        const sumUrl = `${API_BASE_URL}/admin/recordings/${encodeURIComponent(id)}/summary?site=${encodeURIComponent(site)}`;
        const sumRes = await fetch(sumUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (!sumRes.ok) throw new Error(`Failed to load summary: ${sumRes.status}`);
        const sumData = await sumRes.json();
        setSummary(sumData);

        // Unwrap possible shapes
        const s = (sumData && (sumData.summary || sumData)) || {};

        // Audio URL: broaden candidates across shapes
        const rec0 = Array.isArray(logData?.recordings) ? logData.recordings[0] : null;
        const sRec0 = Array.isArray(s?.recordings) ? s.recordings[0] : null;
        const audioUrl =
          logData?.audio_url ||
          logData?.audioUrl ||
          rec0?.presignedUrl || rec0?.url || rec0?.download_url || rec0?.s3_presigned_url ||
          s?.audio_url || s?.audioUrl || sRec0?.presignedUrl || sRec0?.url || sRec0?.download_url || sRec0?.s3_presigned_url ||
          '';

        // Transcript: widen search
        const transcript =
          s.transcript || s.transcription || s.transcriptionText || s.text ||
          s.activities?.transcript || s.activities?.transcription ||
          (Array.isArray(s.transcripts) && s.transcripts[0]?.text) || '';

        // Images from various shapes
        const rawImages = (sumData?.images || s.images || logData?.images || []) as any[];
        const images = (Array.isArray(rawImages) ? rawImages : []).map((img: any, i: number) => ({
          id: img.id || img._id || `img_${i}`,
          url: img.url || img.presignedUrl || img.download_url || img.s3_presigned_url,
          original_name: img.original_name || img.originalName || `Photo ${i + 1}`,
          customMetadata: img.customMetadata,
        })).filter((img: any) => isNonEmptyString(img.url));

        // Build labor as object keyed by role name when API provides an array
        let labor: Record<string, any> = {} as any;
        if (Array.isArray(s.labor)) {
          const toCamelKey = (name?: string) => {
            if (!name) return '';
            const parts = name.trim().replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
            if (!parts.length) return '';
            const [first, ...rest] = parts;
            return first.toLowerCase() + rest.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
          };
          for (const item of s.labor) {
            const key = toCamelKey(item?.role) || toCamelKey(item?.name) || toCamelKey(item?.title);
            if (!key) continue;
            labor[key] = {
              startTime: item?.startTime ?? item?.start_time ?? '',
              finishTime: item?.finishTime ?? item?.finish_time ?? '',
              hours: item?.hours ?? '',
              rate: '$-',
              total: '$-',
              roleName: item?.role ?? item?.name ?? key,
            };
          }
        } else {
          labor = (s.labor || s.laborData || s.labor_data || {}) as any;
        }
        // Normalize subcontractors/materials/equipment: arrays → objects keyed by name, preserve display name
        const toCamelKey = (name?: string) => {
          if (!name) return '';
          const parts = name.trim().replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
          if (!parts.length) return '';
          const [first, ...rest] = parts;
          return first.toLowerCase() + rest.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
        };

        let subcontractors: Record<string, any> = {};
        if (Array.isArray(s.subcontractors)) {
          for (const sc of s.subcontractors) {
            const key = toCamelKey(sc?.name);
            if (!key) continue;
            subcontractors[key] = {
              name: sc?.name ?? key,
              employees: sc?.numberOfEmployees ?? sc?.employees ?? 0,
              hours: sc?.hours ?? 0,
            };
          }
        } else if (s.subcontractors || s.subcontractor) {
          subcontractors = (s.subcontractors || s.subcontractor) as any;
        }

        let materials: Record<string, any> = {};
        if (Array.isArray(s.materials)) {
          for (const m of s.materials) {
            const key = toCamelKey(m?.name);
            if (!key) continue;
            const qty = m?.quantity;
            const uom = m?.unitOfMeasure;
            materials[key] = {
              name: m?.name ?? key,
              qty: qty === undefined || qty === null ? '' : Number(qty).toFixed(2),
              uom: uom ?? '',
              unitRate: '$-',
              tax: '$-',
              total: '$-',
            };
          }
        } else if (s.materialsDeliveries || s.materials) {
          materials = (s.materialsDeliveries || s.materials) as any;
        }

        let equipment: Record<string, any> = {};
        if (Array.isArray(s.equipment)) {
          for (const eq of s.equipment) {
            const key = toCamelKey(eq?.name);
            if (!key) continue;
            equipment[key] = {
              name: eq?.name ?? key,
              days: eq?.daysUsed ?? eq?.days ?? 0,
              monthlyRate: '$-',
              itemRate: '$-',
            };
          }
        } else if (s.equipment) {
          equipment = s.equipment as any;
        }

        const view = {
          id: id,
          date: logData?.local_date || s.date || '',
          jobNumber: logData?.site || site,
          dailyActivities: s.activities?.text || s.activities?.description || s.dailyActivities || s.daily_activities || '',
          laborData: labor,
          subcontractors,
          materialsDeliveries: materials,
          equipment,
          images,
          transcript,
          audioUrl,
        };
        setRecordView(view);
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, site]);

  const openAudio = () => {
    if (recordView?.audioUrl) {
      Linking.openURL(recordView.audioUrl).catch(() => {});
    }
  };

  const onEditField = (fieldType: EditModalProps['fieldType'], fieldLabel: string, fieldPath: string, initialValue: any, placeholder?: string) => {
    setEditModal({ visible: true, fieldType, fieldLabel, fieldPath, initialValue, placeholder });
  };

  const onSaveField = async (value: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const currentSummary = summary?.summary || summary || {};
      const res = await recordingService.updateRecordingField(id, editModal.fieldPath, value, token!, currentSummary);
      if (!res.success) {
        // fallback local update if backend not available yet
        if (res.error?.includes('404')) {
          const updated = { ...recordView };
          const parts = editModal.fieldPath.split('.');
          let cursor: any = updated;
          for (let i = 0; i < parts.length - 1; i++) cursor = cursor[parts[i]];
          cursor[parts[parts.length - 1]] = value;
          setRecordView(updated);
          return { success: true };
        }
        return { success: false, error: res.error };
      }
      // optimistic local update on success
      const updated = { ...recordView };
      const parts = editModal.fieldPath.split('.');
      let cursor: any = updated;
      for (let i = 0; i < parts.length - 1; i++) cursor = cursor[parts[i]];
      cursor[parts[parts.length - 1]] = value;
      setRecordView(updated);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to save' };
    }
  };

  const onDeleteImage = async (imageId: string) => {
    try {
      const res = await imageService.deleteImage(imageId, token!);
      if (res.success) {
        setRecordView({ ...recordView, images: (recordView.images || []).filter((img: any) => img.id !== imageId) });
      }
    } catch {}
  };

  // Section presence checks (only show when data exists)
  const showTranscript = isNonEmptyString(recordView?.transcript);
  const showActivities = isNonEmptyString(recordView?.dailyActivities);
  const showSubcontractors = hasMeaningfulObject(recordView?.subcontractors);
  const showLabor = recordView?.laborData && Object.values(recordView.laborData).some(hasLaborRoleData);
  const showMaterials = hasMeaningfulObject(recordView?.materialsDeliveries);
  const showEquipment = hasMeaningfulObject(recordView?.equipment);
  const showImages = Array.isArray(recordView?.images) && recordView.images.length > 0;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading recording…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={22} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recording Detail</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            <Text style={styles.title}>Daily Work Summary</Text>
            {isNonEmptyString(recordView?.date) && <Text style={styles.subTitle}>{getRecordDate(recordView)}</Text>}
            {isNonEmptyString(recordView?.jobNumber) && <Text style={styles.jobText}>Site: {recordView?.jobNumber}</Text>}
          </View>
          <View style={styles.topRight}>
            {isNonEmptyString(recordView?.audioUrl) && (
              <TouchableOpacity onPress={openAudio} style={styles.audioBtn}>
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={styles.audioBtnText}>Play Audio</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {showTranscript && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TRANSCRIPTION</Text>
            <Text style={styles.paragraph}>{recordView.transcript}</Text>
          </View>
        )}

        {showActivities && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>DAILY ACTIVITIES</Text>
              <TouchableOpacity
                onPress={() => onEditField('multiline', 'Daily Activities', 'dailyActivities', recordView.dailyActivities)}
                style={styles.editButton}
              >
                <Ionicons name="create-outline" size={16} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.cardBox}>
              <Text style={styles.paragraph}>{recordView.dailyActivities}</Text>
            </View>
          </View>
        )}

        {showSubcontractors && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SUBCONTRACTORS</Text>
            {Object.entries(recordView.subcontractors).map(([key, data]: [string, any]) => (
              hasMeaningfulObject(data) ? (
                <EditableSubcontractorCard
                  key={key}
                  company={data?.name || key.replace(/([A-Z])/g, ' $1').replace(/^./, (m) => m.toUpperCase())}
                  employees={data?.employees || 0}
                  hours={data?.hours || 0}
                  contractorKey={key}
                  onEditField={onEditField}
                />
              ) : null
            ))}
          </View>
        )}

        {showLabor && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>LABOR</Text>
            {Object.entries(recordView.laborData).map(([roleKey, data]: [string, any]) => (
              hasLaborRoleData(data) ? (
                <EditableLaborCard
                  key={roleKey}
                  title={data?.roleName || roleKey.replace(/([A-Z])/g, ' $1').replace(/^./, (m) => m.toUpperCase())}
                  data={data}
                  color="#000"
                  roleKey={roleKey}
                  onEditField={onEditField}
                />
              ) : null
            ))}
          </View>
        )}

        {showMaterials && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MATERIALS DELIVERIES</Text>
            {Object.entries(recordView.materialsDeliveries).map(([k, v]: [string, any]) => (
              hasMeaningfulObject(v) ? (
                <EditableMaterialCard key={k} title={v?.name || k.replace(/([A-Z])/g, ' $1').replace(/^./, (m) => m.toUpperCase())} data={v} color="#000" materialKey={k} onEditField={onEditField} />
              ) : null
            ))}
          </View>
        )}

        {showEquipment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EQUIPMENT</Text>
            {Object.entries(recordView.equipment).map(([k, v]: [string, any]) => (
              hasMeaningfulObject(v) ? (
                <EditableEquipmentCard key={k} title={v?.name || k.replace(/([A-Z])/g, ' $1').replace(/^./, (m) => m.toUpperCase())} data={v} color="#000" equipmentKey={k} onEditField={onEditField} />
              ) : null
            ))}
          </View>
        )}

        {showImages && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SITE PHOTOS</Text>
            <View style={styles.imageGrid}>
              {recordView.images.map((img: any, idx: number) => (
                <View key={img.id || idx} style={styles.imageCard}>
                  <Image source={{ uri: img.url }} style={styles.image} />
                  <View style={styles.imageRow}>
                    <Text numberOfLines={1} style={styles.imageName}>{img.original_name || `Photo ${idx + 1}`}</Text>
                    <TouchableOpacity onPress={() => onDeleteImage(img.id)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <EditModal
        visible={editModal.visible}
        onClose={() => setEditModal({ ...editModal, visible: false })}
        onSave={onSaveField}
        fieldType={editModal.fieldType}
        fieldLabel={editModal.fieldLabel}
        initialValue={editModal.initialValue}
        placeholder={editModal.placeholder}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#8E8E93' },
  errorText: { color: '#FF3B30' },
  backBtn: { marginTop: 12, backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  backText: { color: '#fff', fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  backIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  content: { padding: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  topLeft: { flex: 1, paddingRight: 10 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#000' },
  subTitle: { marginTop: 2, color: '#007AFF', fontWeight: '600' },
  jobText: { marginTop: 2, color: '#8E8E93' },
  audioBtn: { backgroundColor: '#34C759', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  audioBtnText: { color: '#fff', fontWeight: '600' },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 8 },
  cardBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#EEE' },
  paragraph: { color: '#1F2937' },
  imageGrid: { gap: 12 },
  imageCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#EEE', overflow: 'hidden' },
  image: { width: '100%', height: 200, backgroundColor: '#F2F2F7' },
  imageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8 },
  imageName: { flex: 1, marginRight: 8, color: '#333' },
  deleteBtn: { backgroundColor: '#FF3B30', borderRadius: 8, padding: 8 },
});

export default AdminSiteSummary;
