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
        <View style={styles.laborTable}>
          <View style={styles.laborHeader}>
            <Text style={styles.laborHeaderText}>ROLE</Text>
            <Text style={styles.laborHeaderText}>START</Text>
            <Text style={styles.laborHeaderText}>FINISH</Text>
            <Text style={styles.laborHeaderText}>HOURS</Text>
            <Text style={styles.laborHeaderText}>RATE</Text>
            <Text style={styles.laborHeaderText}>TOTAL</Text>
          </View>
          <LaborRow  title="Manager" data={record.laborData.manager} />
          <LaborRow title="Foreman" data={record.laborData.foreman} />
          <LaborRow title="Carpenter" data={record.laborData.carpenter} />
          <LaborRow title="Skill Laborer" data={record.laborData.skillLaborer} />
          <LaborRow title="Carpenter (Extra)" data={record.laborData.carpenterExtra} />
        </View>
      </Animated.View>

      {/* Subcontractors Section */}
      <Animated.View style={[styles.detailSection, subcontractorsSectionStyle]}>
        <Text style={styles.sectionTitle}>SUBCONTRACTORS</Text>
        <View style={styles.subcontractorsTable}>
          <View style={styles.subcontractorsHeader}>
            <Text style={styles.subcontractorsHeaderText}>COMPANY</Text>
            <Text style={styles.subcontractorsHeaderText}>EMPLOYEES</Text>
            <Text style={styles.subcontractorsHeaderText}>HOURS</Text>
          </View>
          <View style={styles.subcontractorsRow}>
            <Text style={styles.subcontractorsRowText}>Superior Team Rebar</Text>
            <Text style={styles.subcontractorsRowText}>{record.subcontractors.superiorTeamRebar.employees}</Text>
            <Text style={styles.subcontractorsRowText}>{record.subcontractors.superiorTeamRebar.hours}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Daily Activities Section */}
      <Animated.View style={[styles.detailSection, activitiesSectionStyle]}>
        <Text style={styles.sectionTitle}>DAILY ACTIVITIES</Text>
        <View style={styles.activitiesContainer}>
          <Text style={styles.activitiesText}>{record.dailyActivities}</Text>
        </View>
      </Animated.View>

      {/* Materials Deliveries Section */}
      <Animated.View style={[styles.detailSection, materialsSectionStyle]}>
        <Text style={styles.sectionTitle}>MATERIALS DELIVERIES</Text>
        <View style={styles.materialsTable}>
          <View style={styles.materialsHeader}>
            <Text style={styles.materialsHeaderText}>MATERIAL</Text>
            <Text style={styles.materialsHeaderText}>QTY</Text>
            <Text style={styles.materialsHeaderText}>UOM</Text>
            <Text style={styles.materialsHeaderText}>UNIT RATE</Text>
            <Text style={styles.materialsHeaderText}>TAX</Text>
            <Text style={styles.materialsHeaderText}>TOTAL</Text>
          </View>
          <View style={styles.materialsRow}>
            <Text style={styles.materialsRowText}>Argos Class 4 4500 PSI</Text>
            <Text style={styles.materialsRowText}>{record.materialsDeliveries.argosClass4.qty}</Text>
            <Text style={styles.materialsRowText}>{record.materialsDeliveries.argosClass4.uom}</Text>
            <Text style={styles.materialsRowText}>{record.materialsDeliveries.argosClass4.unitRate}</Text>
            <Text style={styles.materialsRowText}>{record.materialsDeliveries.argosClass4.tax}</Text>
            <Text style={styles.materialsRowText}>{record.materialsDeliveries.argosClass4.total}</Text>
          </View>
          <View style={styles.materialsRow}>
            <Text style={styles.materialsRowText}>Expansion Joint</Text>
            <Text style={styles.materialsRowText}>{record.materialsDeliveries.expansionJoint.qty || '-'}</Text>
            <Text style={styles.materialsRowText}>{record.materialsDeliveries.expansionJoint.uom || '-'}</Text>
            <Text style={styles.materialsRowText}>{record.materialsDeliveries.expansionJoint.unitRate}</Text>
            <Text style={styles.materialsRowText}>{record.materialsDeliveries.expansionJoint.tax}</Text>
            <Text style={styles.materialsRowText}>{record.materialsDeliveries.expansionJoint.total}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Equipment Section */}
      <Animated.View style={[styles.detailSection, equipmentSectionStyle]}>
        <Text style={styles.sectionTitle}>EQUIPMENT</Text>
        <View style={styles.equipmentTable}>
          <View style={styles.equipmentHeader}>
            <Text style={styles.equipmentHeaderText}>EQUIPMENT</Text>
            <Text style={styles.equipmentHeaderText}>DAYS</Text>
            <Text style={styles.equipmentHeaderText}>MONTHLY RATE</Text>
            <Text style={styles.equipmentHeaderText}>ITEM RATE</Text>
          </View>
          <EquipmentRow title="Truck" data={record.equipment.truck} />
          <EquipmentRow title="14k Equipment Trailer" data={record.equipment.equipmentTrailer} />
          <EquipmentRow title="Fuel" data={record.equipment.fuel} />
          <EquipmentRow title="Mini Excavator" data={record.equipment.miniExcavator} />
          <EquipmentRow title="Closed Tool Trailer" data={record.equipment.closedToolTrailer} />
          <EquipmentRow title="Skid Stir" data={record.equipment.skidStir} />
        </View>
      </Animated.View>
    </View>
  );
};

const LaborRow = ({ title, data }: { title: string; data: any }) => (
  <View style={styles.laborRow}>
    <Text
        style={[styles.laborRowText, styles.roleCell]}
        numberOfLines={1}
        ellipsizeMode="tail"
    >
        {title}
    </Text>

    <Text style={styles.laborRowText}>{data.startTime}</Text>
    <Text style={styles.laborRowText}>{data.finishTime}</Text>
    <Text style={styles.laborRowText}>{data.hours}</Text>
    <Text style={styles.laborRowText}>{data.rate}</Text>
    <Text style={styles.laborRowText}>{data.total}</Text>
  </View>
);

const EquipmentRow = ({ title, data }: { title: string; data: any }) => (
  <View style={styles.equipmentRow}>
    <Text style={styles.equipmentRowText}>{title}</Text>
    <Text style={styles.equipmentRowText}>{data.days}</Text>
    <Text style={styles.equipmentRowText}>{data.monthlyRate}</Text>
    <Text style={styles.equipmentRowText}>{data.itemRate}</Text>
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
    width: '90%',
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

  // Labor Table Styles
  laborTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  
  laborHeader: {
    flexDirection: 'row',
    backgroundColor: '#005BBB',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  
  laborHeaderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  laborRow: {
    flexDirection: 'row',
    alignItems: 'center', // 🔄 Align text vertically
    paddingVertical: 14,  // 📐 More vertical breathing room
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  
  laborRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: 20,
  },

  roleCell: {
    flex: 1,
    maxWidth: isSmallScreen ? 80 : 120,
    textAlign: 'left',
    paddingRight: 6,
  },
  
  
  // Optional: specifically for the Role column (to prevent awkward wrapping)
  laborRoleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'left',
    lineHeight: 20,
    paddingRight: 8,
    maxWidth: 100, // adjust based on layout
  },
  
  

  // Subcontractors Styles
subcontractorsTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  subcontractorsHeader: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  subcontractorsHeaderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subcontractorsRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  subcontractorsRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'center',
  },
  
  // Daily Activities Styles
  activitiesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activitiesText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#111827',
  },
  
  // Materials Table Styles
  materialsTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  materialsHeader: {
    flexDirection: 'row',
    backgroundColor: '#34C759',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  materialsHeaderText: {
    flex: 1,
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  materialsRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  materialsRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'center',
  },
  
  // Equipment Table Styles
  equipmentTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  equipmentHeader: {
    flexDirection: 'row',
    backgroundColor: '#FF9500',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  equipmentHeaderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  equipmentRow: {
    flexDirection: 'row',
    alignItems: 'center', // 🔄 Align text vertically
    paddingVertical: 14,  // 📐 More vertical breathing room
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  equipmentRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'center',
    
  },
  
});

export default RecordDetailView; 