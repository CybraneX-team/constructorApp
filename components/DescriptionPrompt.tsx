import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';

interface DescriptionPromptProps {
  visible: boolean;
  onSubmit: (description: string) => void;
  onCancel: () => void;
}

const DescriptionPrompt: React.FC<DescriptionPromptProps> = ({ visible, onSubmit, onCancel }) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    onSubmit(text.trim());
    setText('');
  };

  const handleCancel = () => {
    setText('');
    onCancel();
  };

  // Android: render as inline overlay to avoid Modal glitches
  if (Platform.OS === 'android') {
    if (!visible) return null;
    return (
      <View style={styles.inlineOverlay} pointerEvents="box-none">
        <View style={styles.backdrop} />
        <View style={styles.cardWrapper}>
          <View style={styles.card}>
            <Text style={styles.title}>Add description</Text>
            <Text style={styles.subtitle}>Describe the images you selected</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter description..."
              placeholderTextColor="#8E8E93"
              multiline
              value={text}
              onChangeText={setText}
            />
            <View style={styles.row}>
              <TouchableOpacity onPress={handleCancel} style={[styles.btn, styles.btnGhost]}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmit} style={[styles.btn, styles.btnPrimary]}>
                <Text style={styles.btnPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // iOS: keep Modal for better UX
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      presentationStyle="overFullScreen"
    >
      <View style={styles.backdropModal}>
        <View style={styles.card}>
          <Text style={styles.title}>Add description</Text>
          <Text style={styles.subtitle}>Describe the images you selected</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter description..."
            placeholderTextColor="#8E8E93"
            multiline
            value={text}
            onChangeText={setText}
          />
          <View style={styles.row}>
            <TouchableOpacity onPress={handleCancel} style={[styles.btn, styles.btnGhost]}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSubmit} style={[styles.btn, styles.btnPrimary]}>
              <Text style={styles.btnPrimaryText}>Save</Text>
            </TouchableOpacity>
          </View>
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
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject as any,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cardWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  backdropModal: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#0B0B0B',
    borderRadius: 18,
    padding: 16,
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    zIndex: 2,
    elevation: 10,
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  subtitle: { color: '#8E8E93', marginTop: 6, marginBottom: 12 },
  input: {
    minHeight: 100,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  btn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  btnGhostText: { color: '#8E8E93', fontWeight: '700' },
  btnPrimary: { backgroundColor: '#007AFF' },
  btnPrimaryText: { color: '#fff', fontWeight: '800' },
});

export default DescriptionPrompt; 