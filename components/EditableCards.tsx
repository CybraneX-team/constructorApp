import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EditFieldModalProps } from './EditFieldModal';

interface EditableCardProps {
  onEditField?: (fieldType: EditFieldModalProps['fieldType'], fieldLabel: string, fieldPath: string, initialValue: any, placeholder?: string) => void;
}

export const EditableLaborCard: React.FC<{
  title: string;
  data: any;
  color: string;
  roleKey: string;
} & EditableCardProps> = ({ title, data, color, roleKey, onEditField }) => (
  <View style={[styles.laborCard, { borderLeftColor: color }]}>
    <View style={[styles.cardHeader, { backgroundColor: color }]}>
      <View style={styles.cardHeaderContent}>
        <Text style={styles.cardHeaderText}>{title}</Text>
        {onEditField && (
          <TouchableOpacity 
            onPress={() => onEditField('labor', title, `laborData.${roleKey}`, data)}
            style={styles.cardEditButton}
          >
            <Ionicons name="create-outline" size={14} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
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

export const EditableSubcontractorCard: React.FC<{
  company: string;
  employees: any;
  hours: any;
  contractorKey: string;
} & EditableCardProps> = ({ company, employees, hours, contractorKey, onEditField }) => (
  <View style={styles.subcontractorCard}>
    <View style={[styles.cardHeader, { backgroundColor: '#000' }]}>
      <View style={styles.cardHeaderContent}>
        <Text style={styles.cardHeaderText}>{company}</Text>
        {onEditField && (
          <TouchableOpacity 
            onPress={() => onEditField('subcontractor', company, `subcontractors.${contractorKey}`, { employees, hours })}
            style={styles.cardEditButton}
          >
            <Ionicons name="create-outline" size={14} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
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

export const EditableMaterialCard: React.FC<{
  title: string;
  data: any;
  color: string;
  materialKey: string;
} & EditableCardProps> = ({ title, data, color, materialKey, onEditField }) => (
  <View style={[styles.materialCard, { borderLeftColor: color }]}>
    <View style={[styles.cardHeader, { backgroundColor: color }]}>
      <View style={styles.cardHeaderContent}>
        <Text style={styles.cardHeaderText}>{title}</Text>
        {onEditField && (
          <TouchableOpacity 
            onPress={() => onEditField('material', title, `materialsDeliveries.${materialKey}`, data)}
            style={styles.cardEditButton}
          >
            <Ionicons name="create-outline" size={14} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
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

export const EditableEquipmentCard: React.FC<{
  title: string;
  data: any;
  color: string;
  equipmentKey: string;
} & EditableCardProps> = ({ title, data, color, equipmentKey, onEditField }) => (
  <View style={[styles.equipmentCard, { borderLeftColor: color }]}>
    <View style={[styles.cardHeader, { backgroundColor: color }]}>
      <View style={styles.cardHeaderContent}>
        <Text style={styles.cardHeaderText}>{title}</Text>
        {onEditField && (
          <TouchableOpacity 
            onPress={() => onEditField('equipment', title, `equipment.${equipmentKey}`, data)}
            style={styles.cardEditButton}
          >
            <Ionicons name="create-outline" size={14} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
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

const styles = StyleSheet.create({
  // Card Header Styles
  cardHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardEditButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    flex: 1,
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
