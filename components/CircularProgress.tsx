import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  useSharedValue,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
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
              // Change content based on recording state with smooth transition
              <WorkProgressTransition
                isRecording={isRecording}
                liveTranscription={liveTranscription}
                sizes={sizes}
              />
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
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: -0.3,
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
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  transcriptionText: {
    color: '#8E8E93',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    flex: 1,
    letterSpacing: -0.1,
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
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  accessRecordsText: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  recordsCount: {
    color: '#8E8E93',
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  searchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  searchButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  searchDescription: {
    color: '#8E8E93',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
    letterSpacing: -0.1,
  },
});

// Work Progress Transition Component
interface WorkProgressTransitionProps {
  isRecording: boolean;
  liveTranscription: string;
  sizes: any;
}

const WorkProgressTransition: React.FC<WorkProgressTransitionProps> = ({
  isRecording,
  liveTranscription,
  sizes,
}) => {
  const workProgressOpacity = useSharedValue(1);
  const transcriptionOpacity = useSharedValue(0);
  const infoButtonOpacity = useSharedValue(1);
  
  // Sample work progress data
  const workProgress = {
    completion: 50,
    tasksCompleted: 5,
    totalTasks: 10,
    remainingTasks: [
      'Complete foundation inspection',
      'Install electrical wiring',
      'Finish drywall installation',
      'Paint interior walls'
    ]
  };

  React.useEffect(() => {
    if (isRecording) {
      // Fade out work progress and info button, fade in transcription
      workProgressOpacity.value = withTiming(0, { duration: 300 });
      transcriptionOpacity.value = withTiming(1, { duration: 300 });
      infoButtonOpacity.value = withTiming(0, { duration: 200 });
    } else {
      // Fade out transcription, fade in work progress and info button
      transcriptionOpacity.value = withTiming(0, { duration: 300 });
      workProgressOpacity.value = withTiming(1, { duration: 300 });
      infoButtonOpacity.value = withTiming(1, { duration: 400 });
    }
  }, [isRecording]);

  const workProgressStyle = useAnimatedStyle(() => ({
    opacity: workProgressOpacity.value,
    position: 'absolute' as const,
    width: '100%',
    height: '100%',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  }));

  const transcriptionStyle = useAnimatedStyle(() => ({
    opacity: transcriptionOpacity.value,
    position: 'absolute' as const,
    width: '100%',
    height: '100%',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  }));

  const infoButtonStyle = useAnimatedStyle(() => ({
    opacity: infoButtonOpacity.value,
  }));

  const showWorkInfoModal = () => {
    console.log('🔍 Info button pressed - showing work progress details');
    const remainingTasksText = workProgress.remainingTasks
      .map((task, index) => `${index + 1}. ${task}`)
      .join('\n');
    
    Alert.alert(
      'Work Progress Details',
      `Progress: ${workProgress.completion}%\n\nTasks Completed: ${workProgress.tasksCompleted}/${workProgress.totalTasks}\n\nRemaining Tasks:\n${remainingTasksText}`,
      [{ text: 'OK', style: 'default' }],
      { cancelable: true }
    );
  };

return (
    <View style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Work Progress View */}
      <Animated.View style={workProgressStyle}>
        <View style={workProgressStyles.container}>
          <View style={workProgressStyles.headerContainer}>
            <Text style={[workProgressStyles.title, { fontSize: sizes.fontSize.button + 1 }]}>
              Work Progress
            </Text>
          </View>
          
          {/* Enhanced Progress Ring */}
          <View style={workProgressStyles.progressRingContainer}>
            <ProgressCircle completion={workProgress.completion} />
            <Text style={[workProgressStyles.progressText, { fontSize: sizes.fontSize.duration }]}>
              {workProgress.completion}%
            </Text>
          </View>
          
          <View style={workProgressStyles.statsContainer}>
            <Text style={[workProgressStyles.statusText, { fontSize: sizes.fontSize.transcription }]}>
              {workProgress.tasksCompleted}/{workProgress.totalTasks} tasks completed
            </Text>
          </View>
        </View>
      </Animated.View>
      
      {/* Info Button - positioned at the top level to avoid any container blocking */}
      <Animated.View 
        style={[
          infoButtonStyle,
          {
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 10000,
            elevation: 30,
            pointerEvents: 'box-none',
          }
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            console.log('🔍 Info button touched!');
            showWorkInfoModal();
          }}
          style={[
            workProgressStyles.infoButton,
            {
              position: 'relative',
              top: 0,
              right: 0,
            }
          ]}
          activeOpacity={0.7}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          pointerEvents="auto"
        >
          <MaterialIcons name="info-outline" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>


      {/* Live Transcription View */}
      <Animated.View style={transcriptionStyle}>
        <View style={styles.transcriptionContainer}>
          <Text style={[styles.transcriptionLabel, { fontSize: sizes.fontSize.button }]}>
            Live Transcription
          </Text>
          <Text style={[styles.transcriptionText, { fontSize: sizes.fontSize.transcription }]}>
            {liveTranscription || 'Start recording to see live transcription...'}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

const workProgressStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 16,
    position: 'relative',
  },
  title: {
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    flex: 1,
    letterSpacing: -0.2,
  },
  progressRingContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    padding: 8,
  },
  progressRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  progressFill: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: 'transparent',
    borderTopColor: '#34C759',
    borderRightColor: '#34C759',
    top: -4,
    left: -4,
  },
  progressText: {
    position: 'absolute',
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    fontSize: 13,
    letterSpacing: -0.1,
  },
  infoButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // Modern button styling
    ...Platform.select({
      android: {
        elevation: 25,
        borderWidth: 0,
      },
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: {
          width: 0,
          height: 6,
        },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
    }),
  },
  headerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressInnerRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statsContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: '#8E8E93',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    fontSize: 12,
    letterSpacing: -0.1,
  },
});

// Progress Circle Component
interface ProgressCircleProps {
  completion: number;
}

const ProgressCircle: React.FC<ProgressCircleProps> = ({ completion }) => {
  const progressValue = useSharedValue(0);
  const size = 64; // Total size including stroke
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Animate progress when completion changes
  useEffect(() => {
    progressValue.value = withTiming(completion, {
      duration: 1000,
    });
  }, [completion]);
  
  // Use a simpler approach with View-based progress circle
  const animatedRotation = useAnimatedStyle(() => {
    const rotation = (progressValue.value / 100) * 360;
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });
  
  return (
    <View style={{
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    }}>
      {/* Background circle */}
      <View style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: '#E5E5EA',
        backgroundColor: '#FFFFFF',
      }} />
      
      {/* Progress circle overlay */}
      <View style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
      }}>
        <Animated.View style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: 'transparent',
            borderTopColor: '#34C759',
            borderRightColor: completion > 50 ? '#34C759' : 'transparent',
            borderBottomColor: completion > 50 ? '#34C759' : 'transparent',
            borderLeftColor: completion > 75 ? '#34C759' : 'transparent',
          },
          animatedRotation
        ]} />
      </View>
      
      {/* Inner white circle for depth */}
      <View style={{
        position: 'absolute',
        width: size - (strokeWidth * 2) - 4,
        height: size - (strokeWidth * 2) - 4,
        borderRadius: (size - (strokeWidth * 2) - 4) / 2,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        pointerEvents: 'none',
      }} />
    </View>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  modalContent: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 10,
    textAlign: 'left',
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  progressCircleModal: {
    position: 'relative',
    marginRight: 16,
  },
  circleTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  progressStats: {
    flex: 1,
  },
  progressStatsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  tasksCompletedText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  tasksSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#007AFF',
    marginRight: 12,
    marginTop: 6,
  },
  taskText: {
    flex: 1,
    fontSize: 15,
    color: '#333333',
    lineHeight: 20,
  },
  // Full Screen Modal Styles
  fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 2000,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  fullScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  largeProgressSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  largeProgressCircle: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  largeCircleBackground: {
    transform: [{ scale: 2.5 }],
  },
  largeCircleTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeProgressPercentage: {
    fontSize: 48,
    fontWeight: '800',
    color: '#34C759',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fullScreenTasksSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  fullScreenSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
  },
  tasksList: {
    flex: 1,
  },
  fullScreenTaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
  },
  taskNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  taskNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fullScreenTaskText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    lineHeight: 22,
  },
  bottomAction: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  fullScreenCloseButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fullScreenCloseButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default CircularProgress;
