import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface RefreshOverlayProps {
  isVisible: boolean;
  message: string;
  isSuccess?: boolean;
}

const { width, height } = Dimensions.get('window');

const RefreshOverlay: React.FC<RefreshOverlayProps> = ({
  isVisible,
  message,
  isSuccess = false,
}) => {
  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        {isSuccess ? (
          <MaterialIcons name="check-circle" size={60} color="#4CAF50" />
        ) : (
          <ActivityIndicator size="large" color="#FFFFFF" />
        )}
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 24,
  },
});

export default RefreshOverlay;
