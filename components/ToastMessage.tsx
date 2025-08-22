import React, { useEffect } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  withSequence,
} from 'react-native-reanimated';

interface ToastMessageProps {
  message: string;
  isVisible: boolean;
  onHide?: () => void;
  duration?: number;
  position?: 'center' | 'above-record-button';
  type?: 'info' | 'success' | 'error' | 'warning';
}

export const ToastMessage: React.FC<ToastMessageProps> = ({
  message,
  isVisible,
  onHide,
  duration = 2000,
  position = 'center',
  type = 'info',
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);
  const scale = useSharedValue(0.8);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  useEffect(() => {
    if (isVisible) {
      // Show toast with smooth animation
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 400,
      });

      // Auto hide after duration
      const timeoutId = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 200 });
        translateY.value = withSpring(-30, {
          damping: 20,
          stiffness: 300,
        });
        scale.value = withSpring(0.9, {
          damping: 15,
          stiffness: 400,
        }, () => {
          if (onHide) {
            runOnJS(onHide)();
          }
        });
      }, duration);

      return () => clearTimeout(timeoutId);
    } else {
      // Hide immediately
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withSpring(-30);
      scale.value = withSpring(0.9);
    }
  }, [isVisible, duration, onHide]);

  if (!isVisible) return null;

  const containerStyle = position === 'above-record-button' ? styles.aboveRecordButton : styles.centerPosition;
  const typeStyle = getTypeStyle(type);
  const arrowColor = getArrowColor(type);

  return (
    <Animated.View style={[styles.toastContainer, containerStyle, typeStyle.container, animatedStyle]} pointerEvents="none">
      <Text style={[styles.toastText, typeStyle.text]}>{message}</Text>
      {/* Small arrow pointing down to the record button */}
      {position === 'above-record-button' && <View style={[styles.arrow, { borderTopColor: arrowColor }]} />}
    </Animated.View>
  );
};

// Helper function to get type-based styling
const getTypeStyle = (type: 'info' | 'success' | 'error' | 'warning') => {
  switch (type) {
    case 'success':
      return {
        container: {
          backgroundColor: 'rgba(34, 197, 94, 0.9)',
          borderColor: 'rgba(34, 197, 94, 0.3)',
        },
        text: {
          color: '#FFFFFF',
        },
      };
    case 'error':
      return {
        container: {
          backgroundColor: 'rgba(239, 68, 68, 0.9)',
          borderColor: 'rgba(239, 68, 68, 0.3)',
        },
        text: {
          color: '#FFFFFF',
        },
      };
    case 'warning':
      return {
        container: {
          backgroundColor: 'rgba(245, 158, 11, 0.9)',
          borderColor: 'rgba(245, 158, 11, 0.3)',
        },
        text: {
          color: '#FFFFFF',
        },
      };
    case 'info':
    default:
      return {
        container: {
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },
        text: {
          color: '#FFFFFF',
        },
      };
  }
};

// Helper function to get arrow color based on type
const getArrowColor = (type: 'info' | 'success' | 'error' | 'warning') => {
  switch (type) {
    case 'success':
      return 'rgba(34, 197, 94, 0.9)';
    case 'error':
      return 'rgba(239, 68, 68, 0.9)';
    case 'warning':
      return 'rgba(245, 158, 11, 0.9)';
    case 'info':
    default:
      return 'rgba(0, 0, 0, 0.85)';
  }
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    // Enhanced glassmorphism effect
    backdropFilter: 'blur(20px)',
  },
  centerPosition: {
    top: '75%',
    left: '30%',
    marginLeft: -75,
    marginTop: -25,
    minWidth: 150,
  },
  aboveRecordButton: {
    bottom: 210, // Position above the record button area
    left: '50%',
    marginLeft: -90, // Half of estimated width
    minWidth: 180,
  },
  arrow: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: 6,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0, 0, 0, 0.85)',
  },
  toastText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
});
