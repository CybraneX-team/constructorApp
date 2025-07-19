import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { RecordDetailViewProps } from './types';

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

      {/* Subcontractors Section */}
      <Animated.View style={[styles.detailSection, subcontractorsSectionStyle]}>
        <Text style={styles.sectionTitle}>SUBCONTRACTORS</Text>
        <SubcontractorCard 
          company="Superior Team Rebar"
          employees={record.subcontractors.superiorTeamRebar.employees}
          hours={record.subcontractors.superiorTeamRebar.hours}
        />
      </Animated.View>

      {/* Daily Activities Section */}
      <Animated.View style={[styles.detailSection, activitiesSectionStyle]}>
        <Text style={styles.sectionTitle}>DAILY ACTIVITIES</Text>
        <View style={styles.activitiesCard}>
          <Text style={styles.activitiesText}>{record.dailyActivities}</Text>
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

const RecordDetailView: React.FC<RecordDetailViewProps> = ({ 
  record, 
  onClose, 
  detailScale, 
  detailOpacity, 
  backdropOpacity 
}) => {
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const detailStyle = useAnimatedStyle(() => ({
    transform: [{ scale: detailScale.value }],
    opacity: detailOpacity.value,
  }));

  return (
    <Animated.View style={[styles.recordDetailOverlay, backdropStyle]}>
      <TouchableOpacity 
        style={styles.recordDetailBackdrop} 
        onPress={onClose}
        activeOpacity={1}
      />
      
      <Animated.View style={[styles.recordDetailContainer, detailStyle]}>
        <View style={styles.recordDetailHeader}>
          <View>
            <Text style={styles.recordDetailTitle}>Daily Work Summary</Text>
            <Text style={styles.recordDetailDate}>{record.date}</Text>
            <Text style={styles.recordDetailJob}>Job: {record.jobNumber}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <View style={styles.closeButtonInner}>
              <Text style={styles.closeButtonText}>✕</Text>
            </View>
          </TouchableOpacity>
        </View>

        <FlatList
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.recordDetailContent}
          data={[{ key: 'content' }]}
          renderItem={() => <DetailContent record={record} />}
        />
      </Animated.View>
    </Animated.View>
  );
};

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
  closeButton: {
    padding: 8,
  },
  closeButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
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