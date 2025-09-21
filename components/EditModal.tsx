import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { customAlert } from '../services/customAlertService';

export interface EditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (value: any) => Promise<{ success: boolean; error?: string }>;
  fieldType: 'text' | 'multiline' | 'time' | 'number' | 'currency' | 'labor' | 'material' | 'equipment' | 'subcontractor';
  fieldLabel: string;
  initialValue: any;
  placeholder?: string;
}

const EditModal: React.FC<EditModalProps> = ({
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
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, visible]);

  // Focus the text input when modal becomes visible
  useEffect(() => {
    if (visible && textInputRef.current) {
      const timer = setTimeout(() => {
        textInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      console.log(`[${new Date().toISOString()}] 📝 EDIT_MODAL - Saving ${fieldType} field:`, fieldLabel, 'Value:', value);
      
      const result = await onSave(value);
      
      if (result.success) {
        console.log(`[${new Date().toISOString()}] ✅ EDIT_MODAL - Successfully saved ${fieldLabel}`);
        onClose();
      } else {
        console.error(`[${new Date().toISOString()}] ❌ EDIT_MODAL - Failed to save ${fieldLabel}:`, result.error);
        
        // Check if it's an authentication/authorization error
        if (result.error?.includes('Invalid credentials') || result.error?.includes('401') || result.error?.includes('unauthorized')) {
          customAlert.error(
            'Access Denied',
            'Edit and delete operations are only available to the owner of the recording or admin users. Please contact your admin if you need to modify this recording.'
          );
        } else {
          customAlert.error('Error', result.error || 'Failed to save changes. Please try again.');
        }
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ EDIT_MODAL - Error saving ${fieldLabel}:`, error);
      
      // Check if it's an authentication/authorization error
      if (error instanceof Error && (error.message.includes('Invalid credentials') || error.message.includes('401') || error.message.includes('unauthorized'))) {
        customAlert.error(
          'Access Denied',
          'Edit and delete operations are only available to the owner of the recording or admin users. Please contact your admin if you need to modify this recording.'
        );
      } else {
        customAlert.error('Error', 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const renderInputField = () => {
    switch (fieldType) {
      case 'multiline':
        return (
          <TextInput
            ref={textInputRef}
            style={[styles.input, styles.multilineInput]}
            value={value || ''}
            onChangeText={setValue}
            placeholder={placeholder || `Enter ${fieldLabel.toLowerCase()}...`}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            caretHidden={false}
            contextMenuHidden={false}
            onPressIn={() => {
              textInputRef.current?.focus();
            }}
          />
        );
      
      case 'time':
        return (
          <TextInput
            ref={textInputRef}
            style={styles.input}
            value={value || ''}
            onChangeText={setValue}
            placeholder={placeholder || '8:00 AM'}
            autoCapitalize="none"
            caretHidden={false}
            contextMenuHidden={false}
            onPressIn={() => {
              textInputRef.current?.focus();
            }}
          />
        );
      
      case 'number':
        return (
          <TextInput
            ref={textInputRef}
            style={styles.input}
            value={value?.toString() || ''}
            onChangeText={(text) => setValue(parseFloat(text) || 0)}
            placeholder={placeholder || '0'}
            keyboardType="numeric"
            caretHidden={false}
            contextMenuHidden={false}
            onPressIn={() => {
              textInputRef.current?.focus();
            }}
          />
        );
      
      case 'currency':
        return (
          <TextInput
            ref={textInputRef}
            style={styles.input}
            value={value || ''}
            onChangeText={setValue}
            placeholder={placeholder || '$0.00'}
            keyboardType="numeric"
            caretHidden={false}
            contextMenuHidden={false}
            onPressIn={() => {
              textInputRef.current?.focus();
            }}
          />
        );
      
      case 'labor':
        return (
          <ScrollView style={styles.formScrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Role Name</Text>
              <TextInput
                style={styles.input}
                value={value?.roleName || ''}
                onChangeText={(text) => setValue({ ...value, roleName: text })}
                placeholder="Manager"
                caretHidden={false}
                contextMenuHidden={false}
              />
            </View>

            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Start Time</Text>
                <TextInput
                  style={styles.input}
                  value={value?.startTime || ''}
                  onChangeText={(text) => setValue({...value, startTime: text})}
                  placeholder="8:00 AM"
                  caretHidden={false}
                  contextMenuHidden={false}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Finish Time</Text>
                <TextInput
                  style={styles.input}
                  value={value?.finishTime || ''}
                  onChangeText={(text) => setValue({...value, finishTime: text})}
                  placeholder="5:00 PM"
                  caretHidden={false}
                  contextMenuHidden={false}
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
                  caretHidden={false}
                  contextMenuHidden={false}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Rate</Text>
                <TextInput
                  style={styles.input}
                  value={value?.rate || ''}
                  onChangeText={(text) => setValue({...value, rate: text})}
                  placeholder="$25.00"
                  caretHidden={false}
                  contextMenuHidden={false}
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
                caretHidden={false}
                contextMenuHidden={false}
              />
            </View>
          </ScrollView>
        );
      
      case 'material':
        return (
          <ScrollView style={styles.formScrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={value?.qty || ''}
                  onChangeText={(text) => setValue({...value, qty: text})}
                  placeholder="10"
                  keyboardType="numeric"
                  caretHidden={false}
                  contextMenuHidden={false}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Unit of Measure</Text>
                <TextInput
                  style={styles.input}
                  value={value?.uom || ''}
                  onChangeText={(text) => setValue({...value, uom: text})}
                  placeholder="kg"
                  caretHidden={false}
                  contextMenuHidden={false}
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
                  caretHidden={false}
                  contextMenuHidden={false}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Tax</Text>
                <TextInput
                  style={styles.input}
                  value={value?.tax || ''}
                  onChangeText={(text) => setValue({...value, tax: text})}
                  placeholder="$5.00"
                  caretHidden={false}
                  contextMenuHidden={false}
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
                caretHidden={false}
                contextMenuHidden={false}
              />
            </View>
          </ScrollView>
        );
      
      case 'equipment':
        return (
          <ScrollView style={styles.formScrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Days</Text>
              <TextInput
                style={styles.input}
                value={value?.days?.toString() || ''}
                onChangeText={(text) => setValue({...value, days: parseInt(text) || 0})}
                placeholder="1"
                keyboardType="numeric"
                caretHidden={false}
                contextMenuHidden={false}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Monthly Rate</Text>
              <TextInput
                style={styles.input}
                value={value?.monthlyRate || ''}
                onChangeText={(text) => setValue({...value, monthlyRate: text})}
                placeholder="$1000.00"
                caretHidden={false}
                contextMenuHidden={false}
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Item Rate</Text>
              <TextInput
                style={styles.input}
                value={value?.itemRate || ''}
                onChangeText={(text) => setValue({...value, itemRate: text})}
                placeholder="$50.00"
                caretHidden={false}
                contextMenuHidden={false}
              />
            </View>
          </ScrollView>
        );
      
      case 'subcontractor':
        return (
          <ScrollView style={styles.formScrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Employees</Text>
              <TextInput
                style={styles.input}
                value={value?.employees?.toString() || ''}
                onChangeText={(text) => setValue({...value, employees: parseInt(text) || 0})}
                placeholder="5"
                keyboardType="numeric"
                caretHidden={false}
                contextMenuHidden={false}
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
                caretHidden={false}
                contextMenuHidden={false}
              />
            </View>
          </ScrollView>
        );
      
      default:
        return (
          <TextInput
            ref={textInputRef}
            style={styles.input}
            value={value || ''}
            onChangeText={setValue}
            placeholder={placeholder || `Enter ${fieldLabel.toLowerCase()}...`}
            caretHidden={false}
            contextMenuHidden={false}
            onPressIn={() => {
              textInputRef.current?.focus();
            }}
          />
        );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit {fieldLabel}</Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          {renderInputField()}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#F8F9FA',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    textAlign: 'center',
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
  content: {
    flex: 1,
    padding: 20,
  },
  formScrollView: {
    flex: 1,
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
});

export default EditModal;
