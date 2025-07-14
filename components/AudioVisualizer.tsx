import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

interface AudioVisualizerBorderProps {
  size: number;
  visualizerBars: Animated.SharedValue<number>[];
  isRecording: boolean;
  isFirstCircle: boolean;
}

export const AudioVisualizerBorder: React.FC<AudioVisualizerBorderProps> = ({
  size,
  visualizerBars,
  isRecording,
  isFirstCircle,
}) => {
  if (!isFirstCircle) return null;
  
  return (
    <View style={[styles.visualizerBorderContainer, {
      width: size,
      height: size,
      borderRadius: size / 2,
    }]}>
      {visualizerBars.map((barValue, barIndex) => {
        const angle = (barIndex * 360 / 128) * (Math.PI / 180); // Using 128 bars
        const radius = (size - 30) / 2; // Position bars around the circle border
        const x = size / 2 + radius * Math.cos(angle - Math.PI / 2);
        const y = size / 2 + radius * Math.sin(angle - Math.PI / 2);
        
        return (
          <Animated.View
            key={barIndex}
            style={[
              styles.visualizerBar,
              {
                position: 'absolute',
                left: x - 2, // Centered positioning
                top: y - 14,
                width: 4,
                backgroundColor: '#FF3B30',
                borderRadius: 2,
                transform: [
                  { rotate: `${(barIndex * 360 / 128)}deg` }
                ],
              },
              useAnimatedStyle(() => ({
                height: 16 + barValue.value * 32,
                opacity: isRecording ? Math.max(0.7, barValue.value) : 0.4,
              }))
            ]}
          />
        );
      })}
    </View>
  );
};

// Simplified Audio Visualizer Component for record button
export const AudioVisualizer: React.FC = () => {
  return (
    <View style={styles.visualizerContainer}>
      <View style={styles.recordVisualizerRing} />
    </View>
  );
};

const styles = StyleSheet.create({
  visualizerBorderContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    // Force square aspect ratio
    aspectRatio: 1,
    // Android-specific fixes for perfect circles
    ...Platform.select({
      android: {
        borderWidth: 0.5,
        borderColor: 'rgba(229, 229, 234, 0.3)',
        // Ensure smooth rendering
        renderToHardwareTextureAndroid: true,
        shouldRasterizeIOS: true,
        // Force circular clipping
        overflow: 'hidden',
      },
      ios: {
        borderWidth: 0.1,
        borderColor: 'transparent',
      },
    }),
  },
  visualizerBar: {
    width: 2,
    backgroundColor: '#FF3B30',
    borderRadius: 1,
  },
  visualizerContainer: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  recordVisualizerRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
}); 