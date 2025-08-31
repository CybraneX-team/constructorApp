import { createRef } from 'react';
import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CustomAlertProps } from '../components/CustomAlert';

// Cross-platform haptic feedback functions
const successHaptic = () => {
  if (Platform.OS === 'ios') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else if (Platform.OS === 'android') {
    Vibration.vibrate([50, 100, 50]); // Success pattern: short-long-short
  }
};

const errorHaptic = () => {
  if (Platform.OS === 'ios') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } else if (Platform.OS === 'android') {
    Vibration.vibrate([100, 50, 100, 50, 100]); // Error pattern: long-short-long-short-long
  }
};

const warningHaptic = () => {
  if (Platform.OS === 'ios') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } else if (Platform.OS === 'android') {
    Vibration.vibrate([75, 75, 75]); // Warning pattern: three equal pulses
  }
};

const infoHaptic = () => {
  if (Platform.OS === 'ios') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } else if (Platform.OS === 'android') {
    Vibration.vibrate(50); // Single short vibration for info
  }
};

interface AlertOptions {
  type?: 'info' | 'success' | 'warning' | 'error';
  showCancelButton?: boolean;
  cancelText?: string;
  confirmText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onDismiss?: () => void;
}

class CustomAlertService {
  private alertRef = createRef<any>();

  setAlertRef(ref: any) {
    this.alertRef = ref;
  }

  show(title: string, message: string, options: AlertOptions = {}) {
    // Trigger haptic feedback based on alert type
    const alertType = options.type || 'info';
    switch (alertType) {
      case 'success':
        successHaptic();
        break;
      case 'error':
        errorHaptic();
        break;
      case 'warning':
        warningHaptic();
        break;
      case 'info':
      default:
        infoHaptic();
        break;
    }

    if (this.alertRef.current) {
      this.alertRef.current.show(title, message, options);
    }
  }

  alert(title: string, message: string, onConfirm?: () => void) {
    this.show(title, message, {
      type: 'info',
      onConfirm,
    });
  }

  success(title: string, message: string, onConfirm?: () => void) {
    this.show(title, message, {
      type: 'success',
      onConfirm,
    });
  }

  warning(title: string, message: string, onConfirm?: () => void) {
    this.show(title, message, {
      type: 'warning',
      onConfirm,
    });
  }

  error(title: string, message: string, onConfirm?: () => void) {
    this.show(title, message, {
      type: 'error',
      onConfirm,
    });
  }

  confirm(
    title: string,
    message: string,
    onConfirm?: () => void,
    onCancel?: () => void,
    confirmText = 'OK',
    cancelText = 'Cancel'
  ) {
    this.show(title, message, {
      type: 'info',
      showCancelButton: true,
      confirmText,
      cancelText,
      onConfirm,
      onCancel,
    });
  }

  hide() {
    if (this.alertRef.current) {
      this.alertRef.current.hide();
    }
  }
}

export const customAlert = new CustomAlertService();

// Export haptic functions for use in other parts of the app
export { successHaptic, errorHaptic, warningHaptic, infoHaptic };
