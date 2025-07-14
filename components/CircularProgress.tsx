import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { CircularProgressProps } from './types';
import { AudioVisualizerBorder } from './AudioVisualizer';

const CircularProgress: React.FC<CircularProgressProps> = ({ 
  memo,
  index,
  isMain = false,
  currentIndex,
  circlePositions,
  circleScales,
  circleOpacities,
  visualizerBars,
  isRecording,
  liveTranscription,
  recordsButtonScale,
  handleAccessRecords,
  handlePlayPress,
  handleCircleClick,
}) => {
  const size = isMain ? 320 : 280;
  const progress = memo.progress;
  const isFirstCircle = index === 0;

  // Updated animation style using individual circle animations
  const animatedStyle = useAnimatedStyle(() => {
    // Calculate proper z-index based on visual hierarchy
    let zIndex = 50; // Base z-index
    
    if (index === currentIndex) {
      // Main circle should always be on top
      zIndex = 100;
    } else {
      // Calculate visual position for proper layering
      let visualOrder: number[] = [];
      
      if (currentIndex === 0) {
        visualOrder = [0, 1, 2];
      } else if (currentIndex === 1) {
        visualOrder = [1, 2, 0];
      } else if (currentIndex === 2) {
        visualOrder = [2, 0, 1];
      }
      
      const visualPosition = visualOrder.indexOf(index);
      // Higher visual position (lower on screen) should have lower z-index
      zIndex = 90 - (visualPosition * 10);
    }

    // Ensure high minimum opacity for Android visibility
    const finalOpacity = Math.max(0.85, circleOpacities[index].value);

    return {
      transform: [
        { translateY: circlePositions[index].value },
        { scale: circleScales[index].value },
      ],
      opacity: finalOpacity,
      zIndex: zIndex,
    };
  });

  return (
    <Animated.View style={[styles.circleContainer, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={1.0}
        onPress={() => {
          if (index !== currentIndex) {
            handleCircleClick(index);
          }
        }}
        style={styles.touchableCircle}
      >
        <View style={[
          styles.circleBackground, 
          { 
            width: size + 40, 
            height: size + 40, 
            borderRadius: (size + 40) / 2,
            overflow: 'hidden',
          }
        ]} />
        
        <View style={[
          styles.circularProgressContainer, 
          { 
            width: size, 
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
          }
        ]}>
          {/* Audio Visualizer for first circle */}
          <AudioVisualizerBorder 
            size={size}
            visualizerBars={visualizerBars}
            isRecording={isRecording}
            isFirstCircle={isFirstCircle}
          />
          
          {!isFirstCircle && (
          <View style={[styles.tickMarksContainer, {
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
            position: 'absolute',
            top: 0,
            left: 0,
          }]}>
            {Array.from({ length: 120 }).map((_, tickIndex) => {
              const angle = (tickIndex * 3) * (Math.PI / 180);
              const radius = (size - 20) / 2;
              const x = size / 2 + radius * Math.cos(angle - Math.PI / 2);
              const y = size / 2 + radius * Math.sin(angle - Math.PI / 2);
              
              const distanceFromCenter = Math.sqrt(
                Math.pow(x - size / 2, 2) + Math.pow(y - size / 2, 2)
              );
              
              if (distanceFromCenter > (size / 2 - 10)) {
                return null;
              }
              
              return (
                <View
                  key={tickIndex}
                  style={[
                    styles.tickMark,
                    {
                      left: x - 1,
                      top: y - 2,
                      backgroundColor: tickIndex < (progress * 120 / 100) ? '#FF3B30' : '#E5E5EA',
                    }
                  ]}
                />
              );
            })}
          </View>
          )}
          
          <View style={[styles.centerContent, {
            width: Math.min(160, size * 0.8),
            height: Math.min(160, size * 0.8),
            borderRadius: Math.min(80, size * 0.25),
          }]}>
            {isFirstCircle ? (
              // Live transcription for first circle
              <View style={styles.transcriptionContainer}>
                <Text style={styles.transcriptionLabel}>Live Transcription</Text>
                <Text style={styles.transcriptionText}>
                  {liveTranscription || 'Start recording to see live transcription...'}
                </Text>
              </View>
            ) : index === 1 ? (
              // Access Records button for Record Book circle
              <View style={styles.recordsAccessContainer} >
                <Text style={styles.memoTitle}>{memo.title}</Text>
                
                <Animated.View style={[
                  styles.accessRecordsButtonContainer,
                  useAnimatedStyle(() => ({
                    transform: [{ scale: recordsButtonScale.value }],
                  }))
                ]}>
                  <TouchableOpacity
                    onPress={handleAccessRecords}
                    style={styles.accessRecordsButton}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.accessRecordsText}>Access Records</Text>
                  </TouchableOpacity>
                </Animated.View>
                
                <Text style={styles.recordsCount}>5 recordings</Text>
              </View>
            ) : (
              // Regular memo controls for other circles
              <>
            <Text style={styles.memoTitle}>{memo.title}</Text>
            
            <View style={styles.controlsRow}>
              <TouchableOpacity style={styles.skipButton}>
                <Text style={styles.skipText}>10</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => handlePlayPress(memo.id)}
                style={styles.playButton}
              >
                <Text style={styles.playIcon}>
                  {memo.isPlaying ? '⏸' : '▶'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.skipButton}>
                <Text style={styles.skipText}>10</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.duration}>{memo.duration}</Text>
            <Text style={styles.menuDots}>•••</Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  circleContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    // Force square aspect ratio to ensure perfect circles
    aspectRatio: 1,
    // Android-specific rendering optimizations
    ...Platform.select({
      android: {
        renderToHardwareTextureAndroid: true,
        shouldRasterizeIOS: false,
        // Force layer type for proper rendering
        elevation: 3,
        // Ensure proper compositing
        backgroundColor: 'transparent',
        // Force hardware acceleration with perspective
        transform: [{ perspective: 1000 }],
        // Prevent rendering artifacts
        overflow: 'visible',
      },
      ios: {
        shouldRasterizeIOS: true,
      },
    }),
  },
  touchableCircle: {
    flex: 1, // Make TouchableOpacity take full size of the circle
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBackground: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    // Android-specific circle fixes
    ...Platform.select({
      android: {
        borderWidth: 3,
        borderColor: '#D1D1D6',
        // Force hardware acceleration for smooth circles
        renderToHardwareTextureAndroid: true,
        shouldRasterizeIOS: true,
        // Enhanced elevation for better visibility
        elevation: 12,
        // Solid white background
        backgroundColor: '#FFFFFF',
        // Add subtle transform for GPU acceleration
        transform: [{ perspective: 1000 }],
      },
      ios: {
        borderWidth: 0.5,
        borderColor: '#F0F0F0',
        // Enhanced iOS shadows to match Android elevation
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 6,
        },
        shadowOpacity: 0.15,
        shadowRadius: 15,
      },
    }),
  },
  circularProgressContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    // Force square aspect ratio
    aspectRatio: 1,
    // Android-specific fixes for perfect circles
    ...Platform.select({
      android: {
        borderWidth: 2,
        borderColor: '#D1D1D6',
        // Ensure smooth rendering
        renderToHardwareTextureAndroid: true,
        shouldRasterizeIOS: true,
        // Force circular clipping
        overflow: 'hidden',
        // Full opacity for visibility
        opacity: 1,
        // Enhanced elevation
        elevation: 8,
        // Solid background
        backgroundColor: '#FFFFFF',
        // GPU acceleration
        transform: [{ perspective: 1000 }],
      },
      ios: {
        borderWidth: 0.1,
        borderColor: 'transparent',
        backgroundColor: '#FFFFFF',
        // Add subtle inner shadow for depth
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
    }),
  },
  tickMarksContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    // Ensure circular clipping for tick marks
    ...Platform.select({
      android: {
        borderRadius: 1000, // Large value to ensure circular clipping
        overflow: 'hidden',
      },
      ios: {
        borderRadius: 500,
      },
    }),
  },
  tickMark: {
    position: 'absolute',
    width: 2,
    height: 4,
    borderRadius: 1,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    width: 200,
    height: 200,
    // Make the center content area circular to prevent inner shape artifacts
    borderRadius: 80,
    // Ensure circular clipping on Android
    ...Platform.select({
      android: {
        // overflow: 'hidden',
        backgroundColor: 'transparent',
      },
    }),
  },
  memoTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    width: 140,
  },
  playButton: {
    width: 50,
    height: 50,
    backgroundColor: '#000000',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  playIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 2,
  },
  skipButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  duration: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '400',
    marginBottom: 8,
  },
  menuDots: {
    fontSize: 16,
    color: '#8E8E93',
    letterSpacing: 2,
  },
  transcriptionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  transcriptionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
  },
  transcriptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 20,
  },
  recordsAccessContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  accessRecordsButtonContainer: {
    width: 170,
    height: 60,
    backgroundColor: '#000',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  accessRecordsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessRecordsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  recordsCount: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '400',
  },
});

export default CircularProgress; 