import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface LoginScreenProps {
  navigation?: any;
}

const { width, height } = Dimensions.get('window');

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [superPassword, setSuperPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const { login } = useAuth();

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;
  const buttonScale = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    fadeAnim.setValue(1);
    slideAnim.setValue(0);
  }, [fadeAnim, slideAnim]);

  const handleLogin = async () => {
    if (!email || (!isAdmin && !password) || (isAdmin && !superPassword)) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();

    setIsLoading(true);
    try {
      if (isAdmin) {
        await login(email, '', superPassword);
      } else {
        await login(email, password, undefined);
      }
      router.replace('/site-selection');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAdminMode = () => {
    setPassword('');
    setSuperPassword('');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.light.tint} />
      
      {/* Enhanced Background Gradient */}
      <LinearGradient
        colors={[Colors.light.tint + '20', Colors.light.tint + '05', '#f8fafc']}
        style={styles.backgroundGradient}
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          style={styles.scrollContainer} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
        <Animated.View 
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Enhanced Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[Platform.OS === 'ios' ? '#000' : Colors.light.new, Platform.OS === 'ios' ? '#000' : Colors.light.new + 'CC']}
                style={styles.logoGradient}
              >
                <Ionicons name="shield-checkmark" size={50} color="white" />
              </LinearGradient>
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              {isAdmin ? 'Admin Portal Access' : 'Sign in to your account'}
            </Text>
          </View>

          {/* Enhanced Mode Toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeButton, !isAdmin && styles.activeModeButton]}
              onPress={() => {
                setIsAdmin(false);
                toggleAdminMode();
              }}
              activeOpacity={0.8}
            >
              <Ionicons 
                name="person" 
                size={18} 
                color={!isAdmin ? 'white' : Colors.light.new} 
              />
              <Text style={[styles.modeText, !isAdmin && styles.activeModeText]}>
                User
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, isAdmin && styles.activeModeButton]}
              onPress={() => {
                setIsAdmin(true);
                toggleAdminMode();
              }}
              activeOpacity={0.8}
            >
              <Ionicons 
                name="settings" 
                size={18} 
                color={isAdmin ? 'white' : Colors.light.new} 
              />
              <Text style={[styles.modeText, isAdmin && styles.activeModeText]}>
                Admin
              </Text>
            </TouchableOpacity>
          </View>

          {/* Enhanced Input Fields */}
          <View style={styles.inputContainer}>
            <View style={[
              styles.inputWrapper,
              focusedInput === 'email' && styles.focusedInput
            ]}>
              <Ionicons name="mail-outline" size={22} color={Colors.light.icon} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={Colors.light.icon + '80'}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                selectTextOnFocus={true}
                clearButtonMode="while-editing"
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            <View style={[
              styles.inputWrapper,
              focusedInput === 'password' && styles.focusedInput
            ]}>
              <Ionicons 
                name={isAdmin ? "key-outline" : "lock-closed-outline"} 
                size={22} 
                color={Colors.light.icon} 
                style={styles.inputIcon} 
              />
              <TextInput
                style={styles.input}
                placeholder={isAdmin ? "Superuser Password" : "Password"}
                placeholderTextColor={Colors.light.icon + '80'}
                secureTextEntry={!showPassword}
                value={isAdmin ? superPassword : password}
                onChangeText={isAdmin ? setSuperPassword : setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                selectTextOnFocus={true}
                clearButtonMode="while-editing"
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={22}
                  color={Colors.light.icon}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Enhanced Login Button */}
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity 
              style={[styles.loginButton, isLoading && styles.disabledButton]} 
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[Platform.OS === 'ios' ? '#000' : Colors.light.new, Platform.OS === 'ios' ? '#000' : Colors.light.new + 'CC']}
                style={styles.buttonGradient}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="white" size="small" />
                    <Text style={styles.loadingText}>Signing in...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.loginButtonText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Enhanced Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => router.push('/signup')} style={styles.switchButton}>
              <Text style={styles.switchText}>
                Don't have an account? <Text style={styles.switchTextBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
            
            {/* <TouchableOpacity style={styles.forgotButton}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity> */}
          </View>
        </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    minHeight: height - 100,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 36,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 15,
    },
    shadowOpacity: 0.12,
    shadowRadius: 25,
    elevation: 15,
    borderWidth: 1,
    borderColor: '#000',
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 20,
    shadowColor: Colors.light.new,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 6,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  activeModeButton: {
    backgroundColor: Colors.light.new,
    shadowColor: Colors.light.new,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modeText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.new,
  },
  activeModeText: {
    color: 'white',
  },
  inputContainer: {
    gap: 20,
    marginBottom: 28,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    backgroundColor: '#fafbfc',
    paddingHorizontal: 18,
    height: 64,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  focusedInput: {
    borderColor: Colors.light.tint,
    backgroundColor: 'white',
    shadowColor: Colors.light.tint,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  inputIcon: {
    marginRight: 16,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    paddingVertical: 12,
  },
  eyeIcon: {
    padding: 8,
  },
  loginButton: {
    borderRadius: 20,
    marginBottom: 28,
    shadowColor: Colors.light.new,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  buttonGradient: {
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    gap: 20,
  },
  switchButton: {
    padding: 12,
  },
  switchText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  switchTextBold: {
    color: Colors.light.new,
    fontWeight: '700',
  },
  forgotButton: {
    padding: 12,
  },
  forgotText: {
    fontSize: 16,
    color: Colors.light.tint,
    fontWeight: '600',
  },
});

export default LoginScreen;
