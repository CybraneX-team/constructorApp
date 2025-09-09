import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration, Platform } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { AudioVisualizer } from './AudioVisualizer';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAudioMonitoring } from '../hooks/useAudioMonitoring';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Enhanced helper function for voice-responsive haptic feedback
const triggerHaptic = (type: 'start' | 'continuous' | 'stop', amplitude?: number) => {
  if (Platform.OS === 'ios') {
    switch (type) {
      case 'start':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'continuous':
        // Use amplitude to determine haptic intensity
        if (amplitude !== undefined) {
          if (amplitude > 0.7) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          } else if (amplitude > 0.5) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        break;
      case 'stop':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
    }
  } else if (Platform.OS === 'android') {
    switch (type) {
      case 'start':
        Vibration.vibrate(100); // Short vibration for start
        break;
      case 'continuous':
        // Use amplitude to determine vibration intensity and duration
        if (amplitude !== undefined) {
          const intensity = Math.max(10, Math.min(100, amplitude * 150)); // Scale amplitude to vibration duration
          Vibration.vibrate(intensity);
        } else {
          Vibration.vibrate(50); // Default vibration
        }
        break;
      case 'stop':
        Vibration.vibrate([50, 100, 50]); // Pattern vibration for stop
        break;
    }
  }
};

interface RecordButtonProps {
  onPress: () => void; // Legacy support - not used for hold-to-record
  onPressIn?: () => void; // Start recording when pressed
  onPressOut?: () => void; // Stop recording when released
  recordButtonScale: Animated.SharedValue<number>;
  recordButtonOpacity: Animated.SharedValue<number>;
  visualizerBars?: Animated.SharedValue<number>[]; // Audio amplitude data for voice-responsive haptics
  onSearchPress?: () => void;
  onMoveToSearchCircle?: () => void;
  onCameraPress?: () => void;
  onHomePress?: () => void;
}

export const RecordButton: React.FC<RecordButtonProps> = ({
  onPress,
  onPressIn,
  onPressOut,
  recordButtonScale,
  recordButtonOpacity,
  visualizerBars,
  onSearchPress,
  onMoveToSearchCircle,
  onCameraPress,
  onHomePress,
}) => {
  const { logout } = useAuth();
  const [isRecordingStarted, setIsRecordingStarted] = React.useState(false);
  const holdTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hapticIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Enhanced audio monitoring for voice-responsive haptics
  const { currentAmplitude, startMonitoring, stopMonitoring } = useAudioMonitoring({
    updateInterval: 100, // Update every 100ms for responsive haptics
    threshold: 0.15, // Minimum amplitude threshold
  });
  
  // Calculate average amplitude from visualizer bars for voice-responsive haptics (fallback)
  const getAverageAmplitude = () => {
    if (!visualizerBars || visualizerBars.length === 0) return 0.5; // Default amplitude
    
    const sum = visualizerBars.reduce((acc, bar) => acc + bar.value, 0);
    return sum / visualizerBars.length;
  };
  
  // Get the best available amplitude data
  const getVoiceAmplitude = () => {
    // Use real-time audio monitoring if available, otherwise fall back to visualizer bars
    return currentAmplitude > 0 ? currentAmplitude : getAverageAmplitude();
  };
  
  const recordButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: recordButtonScale.value }],
      opacity: recordButtonOpacity.value,
    };
  });

  const handleLogout = async () => {
    try {
      // Trigger haptic feedback for logout action
      triggerHaptic('stop'); // Use stop haptic for logout
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSearch = () => {
    // Trigger haptic feedback for search action
    triggerHaptic('continuous', 0.5); // Medium haptic for search
    // Move to the Search circle, then open search overlay/modal
    onMoveToSearchCircle?.();
    onSearchPress?.();
  };

  const handleHome = () => {
    // Trigger haptic feedback for home action
    triggerHaptic('continuous', 0.3); // Light haptic for home
    // Navigate to site selection screen
    router.push('/site-selection');
  };

  const handlePressIn = () => {
    console.log('🔴 Press In - Setting timeout');
    
    // Clean up any existing timeout first (edge case handling)
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    
    // Start recording after a short delay to distinguish from tap
    holdTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Timeout fired - Starting recording');
      setIsRecordingStarted(true);
      holdTimeoutRef.current = null; // Clear the timeout reference
      
      // Start audio monitoring for voice-responsive haptics
      startMonitoring();
      
      // Haptic feedback when recording starts
      triggerHaptic('start');
      
      // Start voice-responsive haptic feedback while recording
      hapticIntervalRef.current = setInterval(() => {
        const amplitude = getVoiceAmplitude();
        // Only trigger haptic if amplitude is above threshold to avoid constant feedback
        if (amplitude > 0.15) { // Lower threshold for better responsiveness
          triggerHaptic('continuous', amplitude);
        }
      }, 120); // More responsive haptics based on voice activity
      
      onPressIn?.();
    }, 300); // 300ms hold threshold
  };

  const handlePressOut = () => {
    console.log('🟢 Press Out - Recording started?', isRecordingStarted);
    console.log('🟢 Press Out - Timeout exists?', !!holdTimeoutRef.current);
    
    if (holdTimeoutRef.current) {
      // Timeout hasn't fired yet - this was a quick tap
      console.log('⚡ Quick tap - Clearing timeout and showing toast');
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
      // Only show toast if recording hasn't started
      if (!isRecordingStarted) {
        onPress(); // Show toast
      }
    }
    
    // Always stop recording if it's started, regardless of timeout state
    if (isRecordingStarted) {
      console.log('⏹️ Hold completed - Stopping recording');
      setIsRecordingStarted(false);
      
      // Stop audio monitoring
      stopMonitoring();
      
      // Stop voice-responsive haptic feedback
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
        hapticIntervalRef.current = null;
      }
      
      // Haptic feedback when recording stops
      triggerHaptic('stop');
      
      onPressOut?.();
    }
  };

  // Cleanup timeout and haptic interval on unmount
  React.useEffect(() => {
    return () => {
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
      }
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.recordSection}>
      {/* Home Button */}
      <TouchableOpacity 
        style={styles.homeButton} 
        onPress={handleHome}
      >
        <MaterialIcons name="home" size={24} color="#8E8E93" />
      </TouchableOpacity>
      
      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <MaterialIcons name="logout" size={24} color="#8E8E93" />
      </TouchableOpacity>
      
      <View style={styles.topCurvedSection} />
      <View style={styles.leftCurvedSection} />
      <View style={styles.leftCurvedSectionBar} />
      <View style={styles.rightCurvedSection} />
      <View style={styles.rightCurvedSectionBar} />
      <View style={styles.bottomRectSection} />
      
      {/* Original Record Button Position */}
      <View style={styles.recordButtonWrapper}>
        <AudioVisualizer />
        <AnimatedTouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.recordButton,
            recordButtonAnimatedStyle,
          ]}
          activeOpacity={0.9}
        >
          <View style={styles.recordButtonInner} />
        </AnimatedTouchableOpacity>
      </View>

      {/* Bottom bar action buttons - positioned to not interfere with record button */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          onPress={handleSearch}
          style={[styles.actionButton, styles.actionButtonLeft]}
          activeOpacity={0.8}
        >
          <MaterialIcons name="search" size={25} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.spacer} />

        <TouchableOpacity
          onPress={() => {
            // Trigger haptic feedback for camera action
            triggerHaptic('continuous', 0.5); // Medium haptic for camera
            onCameraPress?.();
          }}
          style={[styles.actionButton, styles.actionButtonRight]}
          activeOpacity={0.8}
        >
          <MaterialIcons name="photo-camera" size={25} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.instructionWrapper}>
        <Text style={styles.recordInstruction}>Hold to record a new memo</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  recordSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    alignItems: 'center',
  },
  topCurvedSection: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -60,
    height: 200,
    width: 120,
    backgroundColor: '#000000',
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
  },
  bottomRectSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: '#000000',
  },
  leftCurvedSection: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    width: 60,
    height: 60,
    backgroundColor: '#F2F2F7',
    borderBottomLeftRadius: 50,
    zIndex: 100,
  },
  leftCurvedSectionBar: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    width: 60,
    height: 60,
    backgroundColor: '#000000',
    borderTopRightRadius: 100,
  },
  rightCurvedSection: {
    position: 'absolute',
    bottom: 120,
    right: 0,
    width: 60,
    height: 60,
    backgroundColor: '#F2F2F7',
    borderBottomRightRadius: 50,
    zIndex: 100,
  },
  rightCurvedSectionBar: {
    position: 'absolute',
    bottom: 120,
    right: 0,
    width: 60,
    height: 60,
    backgroundColor: '#000000',
    borderTopLeftRadius: 100,
  },
  recordButtonWrapper: {
    position: 'absolute',
    top: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF3B30',
  },
  instructionWrapper: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  recordInstruction: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E8E93',
    textAlign: 'center',
  },
  homeButton: {
    position: 'absolute',
    top: 20,
    left: 20, // Position to the left of screen
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  logoutButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 35,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  spacer: {
    width: 70, // Space for the record button
  },
  actionButton: {
    width: 46,
    height: 46,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  actionButtonLeft: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  actionButtonRight: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
});
