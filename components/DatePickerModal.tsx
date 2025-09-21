import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Vibration } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (selectedDate: Date) => void;
  initialDate?: Date;
  isSaving?: boolean;
  modalScale?: any;
  modalOpacity?: any;
  backdropOpacity?: any;
}

// Helper function for haptic feedback
const triggerHaptic = (type: 'light' | 'medium' | 'heavy') => {
  if (Platform.OS === 'ios') {
    switch (type) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
    }
  } else if (Platform.OS === 'android') {
    switch (type) {
      case 'light':
        Vibration.vibrate(30);
        break;
      case 'medium':
        Vibration.vibrate(50);
        break;
      case 'heavy':
        Vibration.vibrate(100);
        break;
    }
  }
};

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialDate = new Date(),
  isSaving = false,
  modalScale,
  modalOpacity,
  backdropOpacity,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedDate(initialDate);
      setShowDatePicker(false);
    }
  }, [visible, initialDate]);

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleConfirm = () => {
    triggerHaptic('medium');
    onConfirm(selectedDate);
  };

  const handleCancel = () => {
    triggerHaptic('light');
    onClose();
  };

  const handleTodayPress = () => {
    triggerHaptic('light');
    const today = new Date();
    setSelectedDate(today);
  };

  const handleYesterdayPress = () => {
    triggerHaptic('light');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setSelectedDate(yesterday);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isYesterday = (date: Date) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    );
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity?.value || withTiming(visible ? 1 : 0),
  }));

  const detailStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale?.value || withTiming(visible ? 1 : 0.8) }],
    opacity: modalOpacity?.value || withTiming(visible ? 1 : 0),
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, backdropStyle]}>
      <TouchableOpacity style={styles.backdrop} onPress={handleCancel} activeOpacity={1} />
      
      <Animated.View style={[styles.container, detailStyle]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeftSection}>
            <Text style={styles.title}>Select Date</Text>
            <Text style={styles.subtitle}>For which date is this recording?</Text>
          </View>
          <View style={styles.headerRightSection}>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <View style={styles.closeButtonInner}>
                <Text style={styles.closeButtonText}>✕</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Selected Date Display */}
          <View style={styles.selectedDateContainer}>
            <MaterialIcons name="event" size={24} color="#007AFF" />
            <View style={styles.selectedDateTextContainer}>
              <Text style={styles.selectedDateText}>
                {formatDate(selectedDate)}
              </Text>
              {isToday(selectedDate) && (
                <Text style={styles.dateLabel}>Today</Text>
              )}
              {isYesterday(selectedDate) && (
                <Text style={styles.dateLabel}>Yesterday</Text>
              )}
            </View>
          </View>

          {/* Quick Date Buttons */}
          <View style={styles.quickButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.quickButton,
                isToday(selectedDate) && styles.quickButtonActive
              ]}
              onPress={handleTodayPress}
            >
              <Text style={[
                styles.quickButtonText,
                isToday(selectedDate) && styles.quickButtonTextActive
              ]}>
                Today
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.quickButton,
                isYesterday(selectedDate) && styles.quickButtonActive
              ]}
              onPress={handleYesterdayPress}
            >
              <Text style={[
                styles.quickButtonText,
                isYesterday(selectedDate) && styles.quickButtonTextActive
              ]}>
                Yesterday
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date Picker Button */}
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => {
              triggerHaptic('light');
              setShowDatePicker(true);
            }}
          >
            <MaterialIcons name="calendar-today" size={20} color="#007AFF" />
            <Text style={styles.datePickerButtonText}>Choose Different Date</Text>
            <MaterialIcons name="chevron-right" size={20} color="#8E8E93" />
          </TouchableOpacity>

          {/* Native Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
              style={styles.datePicker}
            />
          )}

          {/* Info Text */}
          <View style={styles.infoContainer}>
            <MaterialIcons name="info-outline" size={16} color="#8E8E93" />
            <Text style={styles.infoText}>
              This will help organize your recordings by date
            </Text>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity 
            onPress={handleConfirm} 
            style={[styles.confirmButton, isSaving && styles.confirmButtonDisabled]}
            disabled={isSaving}
          >
            {isSaving ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.loadingText}>Saving...</Text>
              </View>
            ) : (
              <Text style={styles.confirmButtonText}>Confirm Date</Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'ios' ? 50 : 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 25,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 30,
    paddingBottom: 16,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerLeftSection: {
    flex: 1,
  },
  headerRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 2,
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
  content: {
    padding: 20,
  },
  selectedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedDateTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  selectedDateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  quickButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  quickButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  quickButtonTextActive: {
    color: '#fff',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  datePickerButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 12,
    flex: 1,
  },
  datePicker: {
    marginBottom: 24,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  infoText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButtonDisabled: {
    backgroundColor: '#999',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default DatePickerModal;
