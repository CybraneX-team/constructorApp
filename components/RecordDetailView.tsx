import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { RecordDetailViewProps } from './types';
import { generateAndSharePDF, generateAndDownloadPDF } from '../utils/pdfGenerator';
import { useAuth } from '../contexts/AuthContext';
import { recordingService } from '../services/recordingService';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;
const isSmallScreen = screenWidth < 360;

// Separate component for detail content to avoid hook violations
const DetailContent: React.FC<{ record: any }> = ({ record }) => {

  // All animated styles moved here to avoid hook violations
  const laborSectionStyle = useAnimatedStyle(() => ({
    opacity: withTiming(1, { duration: 500 }),
    transform: [{ translateY: withTiming(0, { duration: 400 }) }],
  }));

  const subcontractorsSectionStyle = useAnimatedStyle(() => ({
    opacity: withTiming(1, { duration: 600 }),
    transform: [{ translateY: withTiming(0, { duration: 500 }) }],
  }));

  const activitiesSectionStyle = useAnimatedStyle(() => ({
    opacity: withTiming(1, { duration: 700 }),
    transform: [{ translateY: withTiming(0, { duration: 600 }) }],
  }));

  const materialsSectionStyle = useAnimatedStyle(() => ({
    opacity: withTiming(1, { duration: 800 }),
    transform: [{ translateY: withTiming(0, { duration: 700 }) }],
  }));

  const equipmentSectionStyle = useAnimatedStyle(() => ({
    opacity: withTiming(1, { duration: 900 }),
    transform: [{ translateY: withTiming(0, { duration: 800 }) }],
  }));

  return (
    <View>
      {/* Daily Activities Section */}
      <Animated.View style={[styles.detailSection, activitiesSectionStyle]}>
        <Text style={styles.sectionTitle}>DAILY ACTIVITIES</Text>
        <View style={styles.activitiesCard}>
          <Text style={styles.activitiesText}>{record.dailyActivities}</Text>
        </View>
      </Animated.View>

      {/* Subcontractors Section */}
      <Animated.View style={[styles.detailSection, subcontractorsSectionStyle]}>
        <Text style={styles.sectionTitle}>SUBCONTRACTORS</Text>
        <SubcontractorCard 
          company="Superior Team Rebar"
          employees={record.subcontractors.superiorTeamRebar.employees}
          hours={record.subcontractors.superiorTeamRebar.hours}
        />
      </Animated.View>

      {/* Labor Section */}
      <Animated.View style={[styles.detailSection, laborSectionStyle]}>
        <Text style={styles.sectionTitle}>LABOR</Text>
        <View style={styles.cardsContainer}>
          <LaborCard title="Manager" data={record.laborData.manager} color="#000" />
          <LaborCard title="Foreman" data={record.laborData.foreman} color="#000" />
          <LaborCard title="Carpenter" data={record.laborData.carpenter} color="#000" />
          <LaborCard title="Skill Laborer" data={record.laborData.skillLaborer} color="#000" />
          <LaborCard title="Carpenter (Extra)" data={record.laborData.carpenterExtra} color="#000" />
        </View>
      </Animated.View>

      

      

      {/* Materials Deliveries Section */}
      <Animated.View style={[styles.detailSection, materialsSectionStyle]}>
        <Text style={styles.sectionTitle}>MATERIALS DELIVERIES</Text>
        <View style={styles.cardsContainer}>
          <MaterialCard 
            title="Argos Class 4 4500 PSI"
            data={record.materialsDeliveries.argosClass4}
            color="#000"
          />
          <MaterialCard 
            title="Expansion Joint"
            data={record.materialsDeliveries.expansionJoint}
            color="#000"
          />
        </View>
      </Animated.View>

      {/* Equipment Section */}
      <Animated.View style={[styles.detailSection, equipmentSectionStyle]}>
        <Text style={styles.sectionTitle}>EQUIPMENT</Text>
        <View style={styles.cardsContainer}>
          <EquipmentCard title="Truck" data={record.equipment.truck} color="#000" />
          <EquipmentCard title="14k Equipment Trailer" data={record.equipment.equipmentTrailer} color="#000" />
          <EquipmentCard title="Fuel" data={record.equipment.fuel} color="#000" />
          <EquipmentCard title="Mini Excavator" data={record.equipment.miniExcavator} color="#000" />
          <EquipmentCard title="Closed Tool Trailer" data={record.equipment.closedToolTrailer} color="#000" />
          <EquipmentCard title="Skid Stir" data={record.equipment.skidStir} color="#000" />
        </View>
      </Animated.View>
    </View>
  );
};

const LaborCard = ({ title, data, color }: { title: string; data: any; color: string }) => (
  <View style={[styles.laborCard, { borderLeftColor: color }]}>
    <View style={[styles.cardHeader, { backgroundColor: color }]}>
      <Text style={styles.cardHeaderText}>{title}</Text>
    </View>
    <View style={styles.cardContent}>
      <View style={styles.timeSection}>
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>Start</Text>
          <Text style={styles.timeValue}>{data.startTime}</Text>
      </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>Finish</Text>
          <Text style={styles.timeValue}>{data.finishTime}</Text>
        </View>
      </View>
      <View style={styles.dataGrid}>
        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>Hours</Text>
          <Text style={styles.dataValue}>{data.hours}</Text>
        </View>
        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>Rate</Text>
          <Text style={styles.dataValue}>{data.rate}</Text>
        </View>
        <View style={styles.dataItem}>
          <Text style={styles.dataLabel}>Total</Text>
          <Text style={[styles.dataValue, styles.totalValue]}>{data.total}</Text>
        </View>
      </View>
    </View>
  </View>
);

const SubcontractorCard = ({ company, employees, hours }: { company: string; employees: any; hours: any }) => (
  <View style={styles.subcontractorCard}>
    <View style={[styles.cardHeader, { backgroundColor: '#000' }]}>
      <Text style={styles.cardHeaderText}>{company}</Text>
    </View>
    <View style={styles.cardContent}>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{employees}</Text>
          <Text style={styles.statLabel}>Employees</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{hours}</Text>
          <Text style={styles.statLabel}>Hours</Text>
        </View>
      </View>
    </View>
  </View>
);

const MaterialCard = ({ title, data, color }: { title: string; data: any; color: string }) => (
  <View style={[styles.materialCard, { borderLeftColor: color }]}>
    <View style={[styles.cardHeader, { backgroundColor: color }]}>
      <Text style={styles.cardHeaderText}>{title}</Text>
    </View>
    <View style={styles.cardContent}>
      <View style={styles.materialGrid}>
        <View style={styles.materialRow}>
          <View style={styles.materialItem}>
            <Text style={styles.dataLabel}>Quantity</Text>
            <Text style={styles.dataValue}>{data.qty || '-'}</Text>
          </View>
          <View style={styles.materialItem}>
            <Text style={styles.dataLabel}>UOM</Text>
            <Text style={styles.dataValue}>{data.uom || '-'}</Text>
          </View>
        </View>
        <View style={styles.materialRow}>
          <View style={styles.materialItem}>
            <Text style={styles.dataLabel}>Unit Rate</Text>
            <Text style={styles.dataValue}>{data.unitRate}</Text>
          </View>
          <View style={styles.materialItem}>
            <Text style={styles.dataLabel}>Tax</Text>
            <Text style={styles.dataValue}>{data.tax}</Text>
          </View>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={[styles.totalValue, styles.materialTotal]}>{data.total}</Text>
        </View>
      </View>
    </View>
  </View>
);

const EquipmentCard = ({ title, data, color }: { title: string; data: any; color: string }) => (
  <View style={[styles.equipmentCard, { borderLeftColor: color }]}>
    <View style={[styles.cardHeader, { backgroundColor: color }]}>
      <Text style={styles.cardHeaderText}>{title}</Text>
    </View>
    <View style={styles.cardContent}>
      <View style={styles.equipmentGrid}>
        <View style={styles.equipmentRow}>
          <View style={styles.equipmentItem}>
            <Text style={styles.dataLabel}>Days</Text>
            <Text style={styles.dataValue}>{data.days}</Text>
          </View>
          <View style={styles.equipmentItem}>
            <Text style={styles.dataLabel}>Monthly Rate</Text>
            <Text style={styles.dataValue}>{data.monthlyRate}</Text>
          </View>
        </View>
        <View style={styles.equipmentItemRate}>
          <Text style={styles.dataLabel}>Item Rate</Text>
          <Text style={[styles.dataValue, styles.itemRateValue]}>{data.itemRate}</Text>
        </View>
      </View>
    </View>
  </View>
);

// --- Helpers to normalize labor data and compute hours when missing ---
function parseTimeToMinutes(t?: string): number | null {
  if (!t) return null;
  let s = String(t).trim();
  // Normalize variants like "a.m.", "p. m.", unicode periods, etc.
  s = s.replace(/\./g, '').replace(/\s+/g, ' ');
  // Expect formats like "6:30 AM", "06:30 am", "6 AM", "18:00" etc.
  const ampmMatch = s.match(/^\s*(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM|am|pm|a|p)\s*$/);
  if (ampmMatch) {
    let h = Number(ampmMatch[1]);
    const m = Number(ampmMatch[2] ?? 0);
    let mer = ampmMatch[3].toLowerCase();
    if (mer === 'a') mer = 'am';
    if (mer === 'p') mer = 'pm';
    if (mer === 'pm' && h !== 12) h += 12;
    if (mer === 'am' && h === 12) h = 0;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }
  const twentyFour = s.match(/^\s*(\d{1,2})(?::(\d{1,2}))\s*$/);
  if (twentyFour) {
    const h = Number(twentyFour[1]);
    const m = Number(twentyFour[2] ?? 0);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }
  return null;
}

function computeHours(start?: string, finish?: string): string | null {
  const sm = parseTimeToMinutes(start);
  const fm = parseTimeToMinutes(finish);
  if (sm == null || fm == null) return null;
  let diff = fm - sm;
  if (diff < 0) diff += 24 * 60; // overnight shift
  const hours = diff / 60;
  if (Number.isFinite(hours)) return hours.toFixed(2);
  return null;
}

function coalesceString(...vals: any[]): string {
  for (const v of vals) {
    if (v === undefined || v === null) continue;
    const s = String(v);
    if (s.trim() !== '') return s;
  }
  return '';
}

function normalizeLaborRow(row: any): any {
  const safe = row || { startTime: '', finishTime: '', hours: '', rate: '', total: '' };

  // Accept alternate key names from the backend
  const start = coalesceString(
    safe.startTime,
    safe.start_time,
    safe.start,
    safe.arrivalTime,
    safe.arrival_time,
    safe.arrival
  );
  const finish = coalesceString(
    safe.finishTime,
    safe.finish_time,
    safe.finish,
    safe.endTime,
    safe.end_time,
    safe.end,
    safe.departureTime,
    safe.departure_time,
    safe.departure
  );

  safe.startTime = start;
  safe.finishTime = finish;

  const hasHours = safe.hours !== undefined && safe.hours !== null && String(safe.hours).trim() !== '' && !/^0+(\.0+)?$/.test(String(safe.hours).trim());
  if (!hasHours) {
    const h = computeHours(safe.startTime, safe.finishTime);
    if (h != null) safe.hours = h;
  }
  return safe;
}

const RecordDetailView: React.FC<RecordDetailViewProps> = ({ 
  record, 
  onClose, 
  detailScale, 
  detailOpacity, 
  backdropOpacity 
}) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [resolvedRecord, setResolvedRecord] = useState(record);
  const { token } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const loadSummary = async () => {
      try {
        if (!token || !record?.id) return;
        const res = await recordingService.getRecordingSummary(record.id, token);
        if (!res.success || !res.summary) return;
        const mapped = mapSummaryToRecordDetail(record, res.summary);
        if (isMounted) setResolvedRecord(mapped);
      } catch (e) {
        console.error('Failed to resolve summary for record', record.id, e);
      }
    };

    loadSummary();
    return () => { isMounted = false; };
  }, [record?.id, token]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const detailStyle = useAnimatedStyle(() => ({
    transform: [{ scale: detailScale.value }],
    opacity: detailOpacity.value,
  }));

  const handleSharePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      await generateAndSharePDF(resolvedRecord);
    } catch (error) {
      console.error('Error sharing PDF:', error);
      Alert.alert('Error', 'Failed to share PDF. Please try again.', [{ text: 'OK' }]);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsDownloadingPDF(true);
      await generateAndDownloadPDF(resolvedRecord);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Error', 'Failed to download PDF. Please try again.', [{ text: 'OK' }]);
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  return (
    <Animated.View style={[styles.recordDetailOverlay, backdropStyle]}>
      <TouchableOpacity style={styles.recordDetailBackdrop} onPress={onClose} activeOpacity={1} />
      
      <Animated.View style={[styles.recordDetailContainer, detailStyle]}>
        <View style={styles.recordDetailHeader}>
          <View style={styles.headerLeftSection}>
            <Text style={styles.recordDetailTitle}>Daily Work Summary</Text>
            <Text style={styles.recordDetailDate}>{resolvedRecord.date}</Text>
            <Text style={styles.recordDetailJob}>Job: {resolvedRecord.jobNumber}</Text>
          </View>
          <View style={styles.headerRightSection}>
            {/* Share PDF Button */}
            <TouchableOpacity 
              onPress={handleSharePDF} 
              style={styles.shareButton} 
              disabled={isGeneratingPDF || isDownloadingPDF}
            >
              {isGeneratingPDF ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="share-social-outline" size={18} color="#fff" />
              )}
            </TouchableOpacity>
            
            {/* Download PDF Button */}
            <TouchableOpacity 
              onPress={handleDownloadPDF} 
              style={styles.downloadButton} 
              disabled={isGeneratingPDF || isDownloadingPDF}
            >
              {isDownloadingPDF ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="cloud-download-outline" size={18} color="#fff" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <View style={styles.closeButtonInner}>
                <Text style={styles.closeButtonText}>✕</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.recordDetailContent}
          data={[{ key: 'content' }]}
          renderItem={() => <DetailContent record={resolvedRecord} />}
        />
      </Animated.View>
    </Animated.View>
  );
};

function mapSummaryToRecordDetail(existing: any, summary: any): any {
  // Some backends wrap real data inside a `summary` key. Unwrap if present.
  const s = summary && typeof summary === 'object' && summary.summary ? summary.summary : summary;

  // Accept multiple backend shapes: labor, laborData, labor_data
  const laborSrcRaw = (s.labor || s.laborData || s.labor_data || {}) as any;
  // Case-insensitive role keys and common variants
  const roleMap: any = {};
  for (const k of Object.keys(laborSrcRaw)) roleMap[k.toLowerCase()] = (laborSrcRaw as any)[k];
  const laborSrc: any = {
    manager: roleMap['manager'],
    foreman: roleMap['foreman'],
    carpenter: roleMap['carpenter'],
    skillLaborer: roleMap['skilllaborer'] || roleMap['skill_laborer'] || roleMap['skilledlaborer'] || roleMap['skilled_laborer'],
    carpenterExtra: roleMap['carpenterextra'] || roleMap['carpenter_extra'] || roleMap['carpenter (extra)'],
  };

  const subcontractorsSrc = s.subcontractors || s.subcontractor || {};
  const materialsSrc = s.materialsDeliveries || s.materials || {};
  const equipmentSrc = s.equipment || {};

const mapped = {
    ...existing,
    date: summary.date || s.date || existing.date,
    jobNumber: summary.jobNumber || s.jobNumber || existing.jobNumber,
    dailyActivities: s.activities?.text || s.activities?.description || s.dailyActivities || s.daily_activities || s.overview || existing.dailyActivities,
    laborData: {
      manager: laborSrc.manager || existing.laborData.manager,
      foreman: laborSrc.foreman || existing.laborData.foreman,
      carpenter: laborSrc.carpenter || existing.laborData.carpenter,
      skillLaborer: laborSrc.skillLaborer || laborSrc.skill_laborer || existing.laborData.skillLaborer,
      carpenterExtra: laborSrc.carpenterExtra || laborSrc.carpenter_extra || existing.laborData.carpenterExtra,
    },
    subcontractors: {
      superiorTeamRebar: subcontractorsSrc.superiorTeamRebar || subcontractorsSrc.superior_team_rebar || existing.subcontractors.superiorTeamRebar,
    },
    materialsDeliveries: {
      argosClass4: materialsSrc.argosClass4 || materialsSrc.argos_class_4 || existing.materialsDeliveries.argosClass4,
      expansionJoint: materialsSrc.expansionJoint || materialsSrc.expansion_joint || existing.materialsDeliveries.expansionJoint,
    },
    equipment: {
      truck: equipmentSrc.truck || existing.equipment.truck,
      equipmentTrailer: equipmentSrc.equipmentTrailer || equipmentSrc['14k EQUIPMENT TRAILER'] || equipmentSrc.trailer || existing.equipment.equipmentTrailer,
      fuel: equipmentSrc.fuel || existing.equipment.fuel,
      miniExcavator: equipmentSrc.miniExcavator || equipmentSrc.mini_excavator || existing.equipment.miniExcavator,
      closedToolTrailer: equipmentSrc.closedToolTrailer || equipmentSrc.closed_tool_trailer || existing.equipment.closedToolTrailer,
      skidStir: equipmentSrc.skidStir || equipmentSrc.skid_stir || existing.equipment.skidStir,
    },
  } as any;

  // Normalize labor rows to ensure hours is computed when missing
  mapped.laborData = {
    manager: normalizeLaborRow(mapped.laborData.manager),
    foreman: normalizeLaborRow(mapped.laborData.foreman),
    carpenter: normalizeLaborRow(mapped.laborData.carpenter),
    skillLaborer: normalizeLaborRow(mapped.laborData.skillLaborer),
    carpenterExtra: normalizeLaborRow(mapped.laborData.carpenterExtra),
  };

  return mapped;
}

const styles = StyleSheet.create({
  // Record Detail View Styles
  recordDetailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  recordDetailBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  recordDetailContainer: {
    width: '100%',
    height: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'ios' ? 50 : 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 25,
  },
  recordDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 30,
    paddingBottom: 16,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  recordDetailTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  recordDetailDate: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  recordDetailJob: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  headerLeftSection: {
    flex: 1,
  },
  headerRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareButton: {
    backgroundColor: '#34C759',
    borderRadius: 20,
    paddingVertical: 0,
    paddingHorizontal: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    width: 38,
    height: 38,
  },
  downloadButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingVertical: 0,
    paddingHorizontal: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    width: 38,
    height: 38,
  },
  downloadIcon: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
    marginRight: 4,
  },
  downloadText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonInner: {
    width: 38,
    height: 38,
    borderRadius: 50,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  recordDetailContent: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Card Container
  cardsContainer: {
    gap: 12,
  },

  // Labor Card Styles
  laborCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },

  cardHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  cardHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  cardContent: {
    padding: 16,
  },

  timeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  timeRow: {
    alignItems: 'center',
  },

  timeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  timeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },

  dataGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  dataItem: {
    alignItems: 'center',
    flex: 1,
  },

  dataLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  dataValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },

  totalValue: {
    color: '#34C759',
    fontWeight: '700',
  },

  // Subcontractor Card Styles
  subcontractorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderLeftColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },

  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statItem: {
    alignItems: 'center',
    flex: 1,
  },

  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
  },

  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 20,
  },

  // Activities Card Styles
  activitiesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#8E8E93',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  activitiesText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1F2937',
    fontWeight: '500',
  },

  // Material Card Styles
  materialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },

  materialGrid: {
    gap: 12,
  },

  materialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  materialItem: {
    alignItems: 'center',
    flex: 1,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },

  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    textTransform: 'uppercase',
  },

  materialTotal: {
    fontSize: 18,
  },

  // Equipment Card Styles
  equipmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },

  equipmentGrid: {
    gap: 12,
  },

  equipmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  equipmentItem: {
    alignItems: 'center',
    flex: 1,
  },

  equipmentItemRate: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },

  itemRateValue: {
    fontSize: 18,
    color: '#FF9500',
    fontWeight: '700',
  },
});

export default RecordDetailView; 