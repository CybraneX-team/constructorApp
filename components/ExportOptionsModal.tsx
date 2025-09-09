import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface ExportOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onExportWithRates: () => void;
  onExportWithoutRates: () => void;
  isGenerating?: boolean;
}

const ExportOptionsModal: React.FC<ExportOptionsModalProps> = ({
  visible,
  onClose,
  onExportWithRates,
  onExportWithoutRates,
  isGenerating = false,
}) => {
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, { duration: 300 }),
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(visible ? 1 : 0.8, { damping: 15, stiffness: 300 }) },
    ],
    opacity: withTiming(visible ? 1 : 0, { duration: 300 }),
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          onPress={onClose}
          activeOpacity={1}
        />
        
        <Animated.View style={[styles.modalContainer, modalStyle]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Export PDF</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Choose how you want to export the PDF:
            </Text>
            
            <View style={styles.optionsContainer}>
              {/* Export with rates option */}
              <TouchableOpacity
                style={[styles.optionButton, styles.withRatesButton]}
                onPress={onExportWithRates}
                disabled={isGenerating}
                activeOpacity={0.8}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons name="document-text" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>With Rates</Text>
                  <Text style={styles.optionDescription}>
                    Include all pricing information and totals
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              
              {/* Export without rates option */}
              <TouchableOpacity
                style={[styles.optionButton, styles.withoutRatesButton]}
                onPress={onExportWithoutRates}
                disabled={isGenerating}
                activeOpacity={0.8}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons name="document-outline" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Without Rates</Text>
                  <Text style={styles.optionDescription}>
                    Hide pricing information (shows "-" for rates and totals)
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 24,
    paddingTop: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 24,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  withRatesButton: {
    backgroundColor: '#34C759',
  },
  withoutRatesButton: {
    backgroundColor: '#007AFF',
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
});

export default ExportOptionsModal;
