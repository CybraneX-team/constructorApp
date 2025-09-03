import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface EditFieldModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (value: any) => Promise<{ success: boolean; error?: string }>;
  fieldType: 'text' | 'multiline' | 'time' | 'number' | 'currency' | 'labor' | 'material' | 'equipment' | 'subcontractor';
  fieldLabel: string;
  initialValue: any;
  placeholder?: string;
}

const EditFieldModal: React.FC<EditFieldModalProps> = ({
  visible,
  onClose,
  onSave,
  fieldType,
  fieldLabel,
  initialValue,
  placeholder,
}) => {
  const [value, setValue] = useState<any>(initialValue);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, visible]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      console.log(`[${new Date().toISOString()}] 📝 EDIT_FIELD - Saving ${fieldType} field:`, fieldLabel, 'Value:', value);
      
      const result = await onSave(value);
      
      if (result.success) {
        console.log(`[${new Date().toISOString()}] ✅ EDIT_FIELD - Successfully saved ${fieldLabel}`);
        onClose();
      } else {
        console.error(`[${new Date().toISOString()}] ❌ EDIT_FIELD - Failed to save ${fieldLabel}:`, result.error);
        Alert.alert('Error', result.error || 'Failed to save changes. Please try again.');
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ EDIT_FIELD - Error saving ${fieldLabel}:`, error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderInputField = () => {
    switch (fieldType) {
      case 'multiline':
        return (
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={value || ''}
            onChangeText={setValue}
            placeholder={placeholder || `Enter ${fieldLabel.toLowerCase()}...`}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        );
      
      case 'time':
        return (
          <TextInput
            style={styles.input}
            value={value || ''}
            onChangeText={setValue}
            placeholder={placeholder || '8:00 AM'}
            autoCapitalize="none"
          />
        );
      
      case 'number':
        return (
          <TextInput
            style={styles.input}
            value={value?.toString() || ''}
            onChangeText={(text) => setValue(parseFloat(text) || 0)}
            placeholder={placeholder || '0'}
            keyboardType="numeric"
          />
        );
      
      case 'currency':
        return (
          <TextInput
            style={styles.input}
            value={value || ''}
            onChangeText={setValue}
            placeholder={placeholder || '$0.00'}
            keyboardType="numeric"
          />
        );
      
      case 'labor':
        return (
          <ScrollView style={styles.laborForm}>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Start Time</Text>
                <TextInput
                  style={styles.input}
                  value={value?.startTime || ''}
                  onChangeText={(text) => setValue({...value, startTime: text})}
                  placeholder="8:00 AM"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Finish Time</Text>
                <TextInput
                  style={styles.input}
                  value={value?.finishTime || ''}
                  onChangeText={(text) => setValue({...value, finishTime: text})}
                  placeholder="5:00 PM"
                />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Hours</Text>
                <TextInput
                  style={styles.input}
                  value={value?.hours || ''}
                  onChangeText={(text) => setValue({...value, hours: text})}
                  placeholder="8.00"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Rate</Text>
                <TextInput
                  style={styles.input}
                  value={value?.rate || ''}
                  onChangeText={(text) => setValue({...value, rate: text})}
                  placeholder="$25.00"
                />
              </View>
            </View>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Total</Text>
              <TextInput
                style={styles.input}
                value={value?.total || ''}
                onChangeText={(text) => setValue({...value, total: text})}
                placeholder="$200.00"
              />
            </View>
          </ScrollView>
        );
      
      case 'material':
        return (
          <ScrollView style={styles.materialForm}>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={value?.qty || ''}
                  onChangeText={(text) => setValue({...value, qty: text})}
                  placeholder="10"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Unit of Measure</Text>
                <TextInput
                  style={styles.input}
                  value={value?.uom || ''}
                  onChangeText={(text) => setValue({...value, uom: text})}
                  placeholder="kg"
                />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Unit Rate</Text>
                <TextInput
                  style={styles.input}
                  value={value?.unitRate || ''}
                  onChangeText={(text) => setValue({...value, unitRate: text})}
                  placeholder="$50.00"
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Tax</Text>
                <TextInput
                  style={styles.input}
                  value={value?.tax || ''}
                  onChangeText={(text) => setValue({...value, tax: text})}
                  placeholder="$5.00"
                />
              </View>
            </View>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Total</Text>
              <TextInput
                style={styles.input}
                value={value?.total || ''}
                onChangeText={(text) => setValue({...value, total: text})}
                placeholder="$505.00"
              />
            </View>
          </ScrollView>
        );
      
      case 'equipment':
        return (
          <ScrollView style={styles.equipmentForm}>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Days</Text>
              <TextInput
                style={styles.input}
                value={value?.days?.toString() || ''}
                onChangeText={(text) => setValue({...value, days: parseInt(text) || 0})}
                placeholder="1"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Monthly Rate</Text>
              <TextInput
                style={styles.input}
                value={value?.monthlyRate || ''}
                onChangeText={(text) => setValue({...value, monthlyRate: text})}
                placeholder="$1000.00"
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Item Rate</Text>
              <TextInput
                style={styles.input}
                value={value?.itemRate || ''}
                onChangeText={(text) => setValue({...value, itemRate: text})}
                placeholder="$50.00"
              />
            </View>
          </ScrollView>
        );
      
      case 'subcontractor':
        return (
          <ScrollView style={styles.subcontractorForm}>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Employees</Text>
              <TextInput
                style={styles.input}
                value={value?.employees?.toString() || ''}
                onChangeText={(text) => setValue({...value, employees: parseInt(text) || 0})}
                placeholder="5"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Hours</Text>
              <TextInput
                style={styles.input}
                value={value?.hours?.toString() || ''}
                onChangeText={(text) => setValue({...value, hours: parseFloat(text) || 0})}
                placeholder="8.0"
                keyboardType="numeric"
              />
            </View>
          </ScrollView>
        );
      
      default:
        return (
          <TextInput
            style={styles.input}
            value={value || ''}
            onChangeText={setValue}
            placeholder={placeholder || `Enter ${fieldLabel.toLowerCase()}...`}
          />
        );
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.absoluteModalOverlay}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.backdrop} onPress={onClose} />
          
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.modalTitle}>Edit {fieldLabel}</Text>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleSave} 
                  style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.saveButtonText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.modalContent}>
              {renderInputField()}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  absoluteModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10001,
  },
  modalOverlay: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 10000,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  saveButtonDisabled: {
    backgroundColor: '#999',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalContent: {
    padding: 20,
    maxHeight: 400,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#F8F9FA',
  },
  multilineInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  laborForm: {
    maxHeight: 300,
  },
  materialForm: {
    maxHeight: 300,
  },
  equipmentForm: {
    maxHeight: 300,
  },
  subcontractorForm: {
    maxHeight: 200,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formField: {
    flex: 1,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
});

export default EditFieldModal;
