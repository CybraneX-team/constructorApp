import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  showCancelButton?: boolean;
  cancelText?: string;
  confirmText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onDismiss?: () => void;
}

export interface CustomAlertRef {
  show: (title: string, message: string, options?: any) => void;
  hide: () => void;
}

const CustomAlert = forwardRef<CustomAlertRef, CustomAlertProps>(({
  visible,
  title,
  message,
  type = 'info',
  showCancelButton = false,
  cancelText = 'Cancel',
  confirmText = 'OK',
  onConfirm,
  onCancel,
  onDismiss,
}, ref) => {
  const [alertState, setAlertState] = React.useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'error',
    showCancelButton: false,
    cancelText: 'Cancel',
    confirmText: 'OK',
    onConfirm: undefined as (() => void) | undefined,
    onCancel: undefined as (() => void) | undefined,
    onDismiss: undefined as (() => void) | undefined,
  });

  const backdropOpacity = useSharedValue(0);
  const modalScale = useSharedValue(0.8);
  const modalOpacity = useSharedValue(0);

  useImperativeHandle(ref, () => ({
    show: (title: string, message: string, options: any = {}) => {
      setAlertState({
        visible: true,
        title,
        message,
        type: options.type || 'info',
        showCancelButton: options.showCancelButton || false,
        cancelText: options.cancelText || 'Cancel',
        confirmText: options.confirmText || 'OK',
        onConfirm: options.onConfirm,
        onCancel: options.onCancel,
        onDismiss: options.onDismiss,
      });
    },
    hide: () => {
      setAlertState(prev => ({ ...prev, visible: false }));
    },
  }));

  useEffect(() => {
    if (alertState.visible) {
      // Animate in
      backdropOpacity.value = withTiming(1, { duration: 200 });
      modalScale.value = withSpring(1, {
        damping: 15,
        stiffness: 300,
        overshootClamping: false,
      });
      modalOpacity.value = withTiming(1, { duration: 300 });
    } else {
      // Animate out
      backdropOpacity.value = withTiming(0, { duration: 200 });
      modalScale.value = withTiming(0.8, { duration: 200 });
      modalOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [alertState.visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
    transform: [{ scale: modalScale.value }],
  }));

  const handleConfirm = () => {
    if (alertState.onConfirm) {
      alertState.onConfirm();
    }
    setAlertState(prev => ({ ...prev, visible: false }));
  };

  const handleCancel = () => {
    if (alertState.onCancel) {
      alertState.onCancel();
    }
    setAlertState(prev => ({ ...prev, visible: false }));
  };

  const handleBackdropPress = () => {
    if (alertState.onDismiss) {
      alertState.onDismiss();
    }
    setAlertState(prev => ({ ...prev, visible: false }));
  };

  const getTypeConfig = () => {
    switch (alertState.type) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          colors: ['#10B981', '#059669'],
          backgroundColor: '#ECFDF5',
          iconColor: '#10B981',
        };
      case 'warning':
        return {
          icon: 'warning',
          colors: ['#F59E0B', '#D97706'],
          backgroundColor: '#FFFBEB',
          iconColor: '#F59E0B',
        };
      case 'error':
        return {
          icon: 'close-circle',
          colors: ['#EF4444', '#DC2626'],
          backgroundColor: '#FEF2F2',
          iconColor: '#EF4444',
        };
      default: // info
        return {
          icon: 'information-circle',
          colors: ['#3B82F6', '#2563EB'],
          backgroundColor: '#EFF6FF',
          iconColor: '#3B82F6',
        };
    }
  };

  const typeConfig = getTypeConfig();

  if (!alertState.visible) return null;

  return (
    <Modal
      visible={alertState.visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleBackdropPress}
    >
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          onPress={handleBackdropPress}
          activeOpacity={1}
        />
        
        <Animated.View style={[styles.modalContainer, modalStyle]}>
          <View style={[styles.alertContainer, { backgroundColor: typeConfig.backgroundColor }]}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={typeConfig.colors as any}
                style={styles.iconGradient}
              >
                <Ionicons name={typeConfig.icon as any} size={32} color="white" />
              </LinearGradient>
            </View>

            {/* Content */}
            <View style={styles.contentContainer}>
              <Text style={styles.title}>{alertState.title}</Text>
              <Text style={styles.message}>{alertState.message}</Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {alertState.showCancelButton && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>{alertState.cancelText}</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={typeConfig.colors as any}
                  style={styles.confirmButtonGradient}
                >
                  <Text style={styles.confirmButtonText}>{alertState.confirmText}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  backdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: screenWidth * 0.85,
    maxWidth: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  contentContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmButtonGradient: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

CustomAlert.displayName = 'CustomAlert';

export default CustomAlert;
