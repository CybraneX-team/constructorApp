import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface InitialLoaderProps {
  isVisible: boolean;
  message?: string;
}

const InitialLoader: React.FC<InitialLoaderProps> = ({ 
  isVisible, 
  message = 'Loading your workspace...' 
}) => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const progressWidth = useSharedValue(0);

  React.useEffect(() => {
    if (isVisible) {
      // Animate in
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withTiming(1, { duration: 400 });
      rotation.value = withRepeat(
        withTiming(360, { duration: 2000 }),
        -1,
        false
      );
      
      // Animate progress bar
      progressWidth.value = withTiming(100, { duration: 1500 });
    } else {
      // Animate out
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.8, { duration: 200 });
      progressWidth.value = withTiming(0, { duration: 200 });
    }
  }, [isVisible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  if (!isVisible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.container, containerStyle]}>
        <Animated.View style={[styles.iconContainer]}>
          <Image 
            source={require('../assets/images/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
        
        <Text style={styles.title}>VoiceAI Expo</Text>
        <Text style={styles.message}>{message}</Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressStyle]} />
          </View>
          <Text style={styles.progressText}>Setting up your workspace...</Text>
        </View>
      </Animated.View>
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
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    fontWeight: '500',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 2,
    width: '0%', // Will be animated
  },
  progressText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  logo: {
    width: 60,
    height: 60,
  },
});

export default InitialLoader;
