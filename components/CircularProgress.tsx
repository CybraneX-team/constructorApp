import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { CircularProgressProps } from './types';
import { AudioVisualizerBorder } from './AudioVisualizer';

// Get screen dimensions for responsive design
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Calculate responsive sizes based on screen dimensions
const getResponsiveSizes = () => {
  const isSmallDevice = screenWidth < 375 || screenHeight < 667;
  const isMediumDevice = screenWidth >= 375 && screenWidth < 414;
  const isLargeDevice = screenWidth >= 414;
  
  // Base size calculations
  let baseSize, mainSize;
  
  if (isSmallDevice) {
    // iPhone SE, small Android phones
    baseSize = Math.min(screenWidth * 0.65, 240);
    mainSize = Math.min(screenWidth * 0.75, 280);
  } else if (isMediumDevice) {
    // iPhone 12, 13, 14 standard
    baseSize = Math.min(screenWidth * 0.68, 280);
    mainSize = Math.min(screenWidth * 0.78, 320);
  } else {
    // iPhone 12 Pro Max, large Android phones
    baseSize = Math.min(screenWidth * 0.7, 320);
    mainSize = Math.min(screenWidth * 0.8, 360);
  }
  
  return {
    baseSize,
    mainSize,
    centerContentSize: Math.min(baseSize * 0.6, 200),
    tickMarkRadius: (baseSize - 20) / 2,
    padding: isSmallDevice ? 30 : 40,
    fontSize: {
      title: isSmallDevice ? 14 : 16,
      button: isSmallDevice ? 12 : 14,
      duration: isSmallDevice ? 12 : 13,
      transcription: isSmallDevice ? 12 : 14,
    }
  };
};

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
  handleSearchPress,
}) => {
  const sizes = getResponsiveSizes();
  const size = isMain ? sizes.mainSize : sizes.baseSize;
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
    <Animated.View style={[
      styles.circleContainer, 
      animatedStyle,
      { 
        width: size + sizes.padding, 
        height: size + sizes.padding 
      }
    ]}>
      <TouchableOpacity
        activeOpacity={1.0}
        onPress={() => {
          if (index !== currentIndex) {
            handleCircleClick(index);
          }
        }}
        style={[styles.touchableCircle, { width: size + sizes.padding, height: size + sizes.padding }]}
      >
        <View style={[
          styles.circleBackground, 
          { 
            width: size + sizes.padding, 
            height: size + sizes.padding, 
            borderRadius: (size + sizes.padding) / 2,
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
              const radius = sizes.tickMarkRadius;
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
            width: sizes.centerContentSize,
            height: sizes.centerContentSize,
            borderRadius: sizes.centerContentSize / 2,
          }]}>
            {isFirstCircle ? (
              // Live transcription for first circle
              <View style={styles.transcriptionContainer}>
                <Text style={[styles.transcriptionLabel, { fontSize: sizes.fontSize.button }]}>
                  Live Transcription
                </Text>
                <Text style={[styles.transcriptionText, { fontSize: sizes.fontSize.transcription }]}>
                  {liveTranscription || 'Start recording to see live transcription...'}
                </Text>
              </View>
            ) : index === 1 ? (
              // Access Records button for Record Book circle
              <View style={styles.recordsAccessContainer} >
                <Text style={[styles.memoTitle, { fontSize: sizes.fontSize.title }]}>
                  {memo.title}
                </Text>
                
                <Animated.View style={[
                  styles.accessRecordsButtonContainer,
                  useAnimatedStyle(() => ({
                    transform: [{ scale: recordsButtonScale.value }],
                  }))
                ]}>
                  <TouchableOpacity
                    onPress={handleAccessRecords}
                    style={[styles.accessRecordsButton, {
                      width: Math.min(sizes.centerContentSize * 0.9, 140),
                      height: Math.min(sizes.centerContentSize * 0.25, 40),
                    }]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.accessRecordsText, { fontSize: sizes.fontSize.button }]}>
                      Access Records
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
                
                <Text style={[styles.recordsCount, { fontSize: sizes.fontSize.duration }]}>
                  5 recordings
                </Text>
              </View>
            ) : (
              // Search interface for the 3rd circle
              <View style={styles.searchContainer}>
                <Text style={[styles.memoTitle, { fontSize: sizes.fontSize.title }]}>
                  {memo.title}
                </Text>
                
                <TouchableOpacity
                  onPress={() => handleSearchPress?.()}
                  style={[styles.searchButton, {
                    width: Math.min(sizes.centerContentSize * 0.9, 140),
                    height: Math.min(sizes.centerContentSize * 0.3, 45),
                  }]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.searchButtonText, { fontSize: sizes.fontSize.button }]}>
                    Search
                  </Text>
                </TouchableOpacity>
                
                <Text style={[styles.searchDescription, { fontSize: sizes.fontSize.duration }]}>
                  Find recordings by chatting in natural language
                </Text>
              </View>
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
    // Make the center content area circular to prevent inner shape artifacts
    // Ensure circular clipping on Android
    ...Platform.select({
      android: {
        // overflow: 'hidden',
        backgroundColor: 'transparent',
      },
    }),
  },
  memoTitle: {
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: 8,
  },
  skipButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000000',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  playIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  duration: {
    color: '#8E8E93',
    fontWeight: '400',
    marginBottom: 4,
    textAlign: 'center',
  },
  menuDots: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '600',
    textAlign: 'center',
  },
  transcriptionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    paddingHorizontal: 20,

  },
  transcriptionLabel: {
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  transcriptionText: {
    color: '#8E8E93',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 18,
    flex: 1,
  },
  recordsAccessContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  accessRecordsButtonContainer: {
    marginBottom: 12,
  },
  accessRecordsButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  accessRecordsText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  recordsCount: {
    color: '#8E8E93',
    fontWeight: '400',
  },
  searchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  searchButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  searchDescription: {
    color: '#8E8E93',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
  },
});

export default CircularProgress;