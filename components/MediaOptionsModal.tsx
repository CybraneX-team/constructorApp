import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface MediaOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onCapture: () => void;
  onPick: () => void;
}

const MediaOptionsModal: React.FC<MediaOptionsModalProps> = ({ visible, onClose, onCapture, onPick }) => {
  const handleCapture = () => {
    console.log('📷 Modal: Capture button pressed');
    onClose();
    setTimeout(() => onCapture(), 120);
  };

  const handlePick = () => {
    console.log('📚 Modal: Pick button pressed');
    onClose();
    setTimeout(() => onPick(), 120);
  };

  const handleClose = () => {
    console.log('❌ Modal: Close button pressed');
    onClose();
  };

  console.log('📱 Modal visible:', visible);

  // Android: inline overlay instead of RN Modal to avoid glitches
  if (Platform.OS === 'android') {
    if (!visible) return null;
    return (
      <View style={styles.inlineOverlay} pointerEvents="box-none">
        <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={handleClose} />
        <View style={[styles.container, styles.androidContainer]}>
          <Text style={styles.title}>Add media</Text>
          <Text style={styles.subtitle}>Choose how you want to add images</Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCapture} activeOpacity={0.7}>
              <MaterialIcons name="photo-camera" size={24} color="#ffffff" />
              <Text style={styles.actionText}>Capture</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handlePick} activeOpacity={0.7}>
              <MaterialIcons name="photo-library" size={24} color="#ffffff" />
              <Text style={styles.actionText}>Upload</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // iOS: use Modal
  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <TouchableOpacity 
          style={styles.backdropTouchable} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        <View style={styles.container}>
          <Text style={styles.title}>Add media</Text>
          <Text style={styles.subtitle}>Choose how you want to add images</Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleCapture} 
              activeOpacity={0.7}
            >
              <MaterialIcons name="photo-camera" size={24} color="#ffffff" />
              <Text style={styles.actionText}>Capture</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handlePick} 
              activeOpacity={0.7}
            >
              <MaterialIcons name="photo-library" size={24} color="#ffffff" />
              <Text style={styles.actionText}>Upload</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  inlineOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 9998,
    backgroundColor: 'rgba(0,0,0,0.6)'
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    position: 'absolute',
    left: '7%',
    right: '7%',
    top: '25%',
    backgroundColor: '#0B0B0B',
    borderRadius: 18,
    padding: 18,
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    zIndex: 1,
    elevation: 10,
  },
  androidContainer: {
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#8E8E93', marginBottom: 16 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionButton: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    elevation: 3,
  },
  actionText: { marginTop: 6, color: '#fff', fontWeight: '700' },
  closeButton: { 
    marginTop: 14, 
    alignSelf: 'center', 
    padding: 8,
    minHeight: 40,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#8E8E93', fontWeight: '600' },
});

export default MediaOptionsModal; 