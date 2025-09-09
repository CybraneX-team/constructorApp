import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  Keyboard,
  ScrollView,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as Haptics from 'expo-haptics';
import { customAlert } from '../services/customAlertService';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing } from 'react-native-reanimated';
import API_CONFIG from '../config/api';

interface ResetPasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ visible, onClose }) => {
  const [stage, setStage] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const fieldPositions = useRef<Record<string, number>>({}).current;

  // Dynamic bottom padding per stage
  const contentBottomPadding = useMemo(() => {
    const kb = keyboardHeight || 0;
    if (stage === 'request') {
      // Lighter lift for simple single-field form
      return Math.max(8, Math.min(200, kb));
    }
    // Slightly more lift for multi-field reset form
    return Math.max(12, Math.min(40, Math.floor(kb * 0)));
  }, [keyboardHeight, stage]);

  // Animations
  const backdropOpacity = useSharedValue(0);
  const modalTranslateY = useSharedValue(48);
  const modalOpacity = useSharedValue(0);
  const modalScale = useSharedValue(0.98);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) });
      modalTranslateY.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
      modalOpacity.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
      modalScale.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 180, easing: Easing.in(Easing.quad) });
      modalTranslateY.value = withTiming(48, { duration: 220, easing: Easing.in(Easing.quad) });
      modalOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) });
      modalScale.value = withTiming(0.98, { duration: 200, easing: Easing.in(Easing.quad) });
      // reset state when closing
      setTimeout(() => {
        setStage('request');
        setEmail('');
        setResetCode('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setLoading(false);
      }, 180);
    }
  }, [visible]);

  // Back handler
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!visible) return false;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (stage === 'reset') {
        setStage('request');
      } else {
        onClose();
      }
      return true;
    });
    return () => sub.remove();
  }, [visible, stage, onClose]);

  // Keyboard management to lift sheet above keyboard
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
    };
    const onHide = () => setKeyboardHeight(0);

    const s1 = Keyboard.addListener(showEvent as any, onShow);
    const s2 = Keyboard.addListener(hideEvent as any, onHide);
    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalTranslateY.value }, { scale: modalScale.value }],
    opacity: modalOpacity.value,
  }));

  const handleRequest = async () => {
    if (!email.trim()) {
      customAlert.error('Missing Email', 'Please enter your account email.');
      return;
    }
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await fetch(`${API_CONFIG.BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = 'Failed to send OTP. Please try again.';
        try { const j = JSON.parse(text); msg = j.error || j.message || msg; } catch {}
        throw new Error(msg);
      }
      customAlert.success('OTP Sent', 'We emailed you a 6-digit code valid for 15 minutes.');
      setStage('reset');
    } catch (e: any) {
      customAlert.error('Error', e.message || 'Could not send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim() || !resetCode.trim() || !newPassword) {
      customAlert.error('Missing Fields', 'Fill email, code, and new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      customAlert.error('Password Mismatch', 'New password and confirm do not match.');
      return;
    }
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await fetch(`${API_CONFIG.BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), reset_code: resetCode.trim(), new_password: newPassword }),
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = 'Failed to reset password. Please try again.';
        try { const j = JSON.parse(text); msg = j.error || j.message || msg; } catch {}
        throw new Error(msg);
      }
      customAlert.success('Password Updated', 'Your password was reset. You can now sign in.', onClose);
    } catch (e: any) {
      customAlert.error('Error', e.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity style={styles.backdropTouchable} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Use KeyboardAwareScrollView; keep sheet docked and let content lift */}
      <Animated.View style={[styles.sheet, { bottom: 0 }, modalStyle]}>
        <View style={styles.handleBar} />
        <View style={styles.header}>
          <Text style={styles.title}>{stage === 'request' ? 'Forgot Password' : 'Reset Password'}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={[styles.content, { paddingBottom: contentBottomPadding }]}>
          {stage === 'request' ? (
            <KeyboardAwareScrollView
              innerRef={(ref: any) => (scrollRef.current = (ref as unknown as ScrollView) || null)}
              contentContainerStyle={styles.form}
              enableOnAndroid
              extraScrollHeight={80}
              keyboardOpeningTime={150}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.helper}>Enter your account email and we'll send a 6-digit code.</Text>
              <View
                style={styles.inputRow}
                onLayout={(e) => { fieldPositions['request_email'] = e.nativeEvent.layout.y; }}
              >
                <Ionicons name="mail-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#8E8E93"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onFocus={() => {
                    const y = fieldPositions['request_email'] || 0;
                    if (keyboardHeight > 0) {
                      scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
                    }
                  }}
                />
              </View>

              <TouchableOpacity onPress={handleRequest} style={[styles.primaryButton, loading && styles.disabled]} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Send Code</Text>}
              </TouchableOpacity>
            </KeyboardAwareScrollView>
          ) : (
            <KeyboardAwareScrollView
              innerRef={(ref: any) => (scrollRef.current = (ref as unknown as ScrollView) || null)}
              contentContainerStyle={styles.form}
              enableOnAndroid
              extraScrollHeight={100}
              keyboardOpeningTime={150}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.helper}>Enter the 6-digit code and your new password.</Text>

              <View
                style={styles.inputRow}
                onLayout={(e) => { fieldPositions['reset_email'] = e.nativeEvent.layout.y; }}
              >
                <Ionicons name="mail-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#8E8E93"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onFocus={() => {
                    const y = fieldPositions['reset_email'] || 0;
                    if (keyboardHeight > 0) {
                      scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
                    }
                  }}
                />
              </View>

              <View
                style={styles.inputRow}
                onLayout={(e) => { fieldPositions['reset_code'] = e.nativeEvent.layout.y; }}
              >
                <Ionicons name="key-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="6-digit code"
                  placeholderTextColor="#8E8E93"
                  value={resetCode}
                  onChangeText={setResetCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  onFocus={() => {
                    const y = fieldPositions['reset_code'] || 0;
                    if (keyboardHeight > 0) {
                      scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
                    }
                  }}
                />
              </View>

              <View
                style={styles.inputRow}
                onLayout={(e) => { fieldPositions['reset_new'] = e.nativeEvent.layout.y; }}
              >
                <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="New password"
                  placeholderTextColor="#8E8E93"
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  autoCapitalize="none"
                  onFocus={() => {
                    const y = fieldPositions['reset_new'] || 0;
                    if (keyboardHeight > 0) {
                      scrollRef.current?.scrollTo({ y: Math.max(0, y - 100), animated: true });
                    }
                  }}
                />
                <TouchableOpacity onPress={() => setShowPassword(s => !s)} style={styles.eye}>
                  <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              <View
                style={styles.inputRow}
                onLayout={(e) => { fieldPositions['reset_confirm'] = e.nativeEvent.layout.y; }}
              >
                <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  placeholderTextColor="#8E8E93"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                  onFocus={() => {
                    const y = fieldPositions['reset_confirm'] || 0;
                    if (keyboardHeight > 0) {
                      scrollRef.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
                    }
                  }}
                />
              </View>

              <TouchableOpacity onPress={handleReset} style={[styles.primaryButton, loading && styles.disabled]} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Reset Password</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStage('request')} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Back to Send Code</Text>
              </TouchableOpacity>
            </KeyboardAwareScrollView>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 24,
  },
  handleBar: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginTop: 8,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  form: {
    gap: 16,
  },
  helper: {
    color: '#D1D1D6',
    fontSize: 15,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    paddingVertical: 14,
    fontSize: 15,
  },
  eye: {
    padding: 6,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#9FA0A6',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.7,
  },
});

export default ResetPasswordModal;


