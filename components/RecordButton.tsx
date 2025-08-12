import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { AudioVisualizer } from './AudioVisualizer';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { router } from 'expo-router';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface RecordButtonProps {
  onPress: () => void;
  recordButtonScale: Animated.SharedValue<number>;
  recordButtonOpacity: Animated.SharedValue<number>;
  onSearchPress?: () => void;
  onMoveToSearchCircle?: () => void;
  onCameraPress?: () => void;
}

export const RecordButton: React.FC<RecordButtonProps> = ({
  onPress,
  recordButtonScale,
  recordButtonOpacity,
  onSearchPress,
  onMoveToSearchCircle,
  onCameraPress,
}) => {
  const { logout } = useAuth();
  
  const recordButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: recordButtonScale.value }],
      opacity: recordButtonOpacity.value,
    };
  });

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSearch = () => {
    // Move to the Search circle, then open search overlay/modal
    onMoveToSearchCircle?.();
    onSearchPress?.();
  };

  return (
    <View style={styles.recordSection}>
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
          onPress={onPress}
          style={[
            styles.recordButton,
            recordButtonAnimatedStyle,
          ]}
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
          onPress={onCameraPress}
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
