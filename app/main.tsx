import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Dimensions,
  Platform,
  FlatList,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  Extrapolate,
  useAnimatedGestureHandler,
  runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Audio } from 'expo-av';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Memo {
  id: string;
  title: string;
  duration: string;
  isPlaying: boolean;
  progress: number;
}

const VoiceMemosScreen = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liveTranscription, setLiveTranscription] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(32).fill(0));
  const flatListRef = useRef<FlatList>(null);
  const [memos, setMemos] = useState<Memo[]>([
    {
      id: '1',
      title: 'Live Recording',
      duration: '00:00',
      isPlaying: false,
      progress: 0,
    },
    {
      id: '2',
      title: 'Record\nBook',
      duration: '02:15',
      isPlaying: false,
      progress: 0,
    },
    {
      id: '3',
      title: 'Search\nRecords',
      duration: '00:28',
      isPlaying: false,
      progress: 0,
    },
  ]);

  // Animation values
  const recordButtonScale = useSharedValue(1);
  const recordButtonOpacity = useSharedValue(1);
  
  // Animated title values for smooth seamless transitions
  const oldTitleTranslateY = useSharedValue(0);
  const oldTitleOpacity = useSharedValue(1);
  const newTitleTranslateY = useSharedValue(30); // Starts below
  const newTitleOpacity = useSharedValue(0);
  
  // Track titles for seamless transition
  const [displayTitle, setDisplayTitle] = useState('CAPTURE\nNOW');
  const [previousTitle, setPreviousTitle] = useState('CAPTURE\nNOW');
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Audio visualizer animation values - 128 bars for denser circular visualizer
  const visualizerBars = Array.from({ length: 128 }, () => useSharedValue(0.3));

  // Gesture values for swipe navigation
  const translateY = useSharedValue(0);
  const gestureActive = useSharedValue(false);

  // Animation values for smooth circle transitions
  const circleTransition = useSharedValue(0);
  const isTransitioning = useSharedValue(false);

  // Individual position animations for each circle
  const circlePositions = Array.from({ length: memos.length }, () => useSharedValue(0));
  const circleScales = Array.from({ length: memos.length }, () => useSharedValue(1));
  const circleOpacities = Array.from({ length: memos.length }, () => useSharedValue(1));

  // Get current title based on active circle
  const getCurrentTitle = () => {
    const currentMemo = memos[currentIndex];
    if (currentIndex === 0) return 'CAPTURE\nNOW';
    return currentMemo.title.toUpperCase().replace('\\n', ' ');
  };

  // Memoized current title for performance
  const currentTitle = React.useMemo(() => getCurrentTitle(), [currentIndex, memos]);

  // Animate title change when currentIndex changes
  useEffect(() => {
    const newTitle = getCurrentTitle();
    
    if (newTitle !== displayTitle && !isAnimating) {
      setIsAnimating(true);
      setPreviousTitle(displayTitle);
      
      // Start seamless transition - old text slides up and fades out
      oldTitleTranslateY.value = withTiming(-20, { duration: 200 });
      oldTitleOpacity.value = withTiming(0, { duration: 200 });
      
      // New text slides up from below and fades in (slight delay for overlap)
      setTimeout(() => {
        setDisplayTitle(newTitle);
        newTitleTranslateY.value = 20; // Reset to start position
        newTitleOpacity.value = 0;
        
        newTitleTranslateY.value = withSpring(0, {
          damping: 20,
          stiffness: 400,
          mass: 0.6,
        });
        
        newTitleOpacity.value = withTiming(1, {
          duration: 300,
        }, () => {
          // After animation completes, reset for next transition
          oldTitleTranslateY.value = 0;
          oldTitleOpacity.value = 1;
          newTitleTranslateY.value = 30;
          newTitleOpacity.value = 0;
          setIsAnimating(false);
        });
      }, 100); // Small overlap for seamless effect
    }
  }, [currentIndex]);

  // Initialize circle positions on mount
  useEffect(() => {
    // Set initial positions based on currentIndex
    animateCirclesToNewPositions(currentIndex);
  }, []);

  // Function to change index (callable from gesture handler)
  const changeIndex = (newIndex: number) => {
    if (newIndex !== currentIndex && !isTransitioning.value) {
      isTransitioning.value = true;
      
      // Update the index
      setCurrentIndex(newIndex);
      
      // Animate all circles to new positions
      animateCirclesToNewPositions(newIndex);
      
      // Reset transition flag after animation
      setTimeout(() => {
        isTransitioning.value = false;
      }, 700); // Slightly longer than animation duration
    }
  };

  // Function for smooth circle click transitions
  const handleCircleClick = (newIndex: number) => {
    if (newIndex !== currentIndex && !isTransitioning.value) {
      isTransitioning.value = true;
      
      // Update the index
      setCurrentIndex(newIndex);
      
      // Animate all circles to new positions
      animateCirclesToNewPositions(newIndex);
      
      // Reset transition flag after animation
      setTimeout(() => {
        isTransitioning.value = false;
      }, 700); // Slightly longer than animation duration
    }
  };

  // Function to animate circles to their new positions
  const animateCirclesToNewPositions = (newIndex: number) => {
    // Calculate new visual order
    let newVisualOrder: number[] = [];
    
    if (newIndex === 0) {
      newVisualOrder = [0, 1, 2];
    } else if (newIndex === 1) {
      newVisualOrder = [1, 2, 0];
    } else if (newIndex === 2) {
      newVisualOrder = [2, 0, 1];
    }

    // Animate each circle to its new position with staggered timing
    memos.forEach((_, index) => {
      const newVisualPosition = newVisualOrder.indexOf(index);
      const targetPosition = newVisualPosition * 160;
      
      // Calculate target scale and opacity
      let targetScale, targetOpacity;
      if (index === newIndex) {
        targetScale = 1;
        targetOpacity = 1;
      } else {
        const distance = newVisualPosition;
        targetScale = interpolate(
          distance,
          [0, 1, 2, 3],
          [1, 0.9, 0.75, 0.6],
          Extrapolate.CLAMP
        );
        targetOpacity = interpolate(
          distance,
          [0, 1, 2, 3],
          [1, 0.8, 0.6, 0.4],
          Extrapolate.CLAMP
        );
      }

      // Staggered animation timing using setTimeout
      const delay = newVisualPosition * 50; // 50ms stagger between circles
      
      const animateCircle = () => {
        // Animate position
        circlePositions[index].value = withTiming(targetPosition, {
          duration: 600,
        });
        
        // Animate scale
        circleScales[index].value = withSpring(targetScale, {
          damping: 15,
          stiffness: 300,
        });
        
        // Animate opacity
        circleOpacities[index].value = withTiming(targetOpacity, {
          duration: 400,
        });
      };

      if (delay > 0) {
        setTimeout(animateCircle, delay);
      } else {
        animateCircle();
      }
    });
  };

  // Pan gesture handler for swipe navigation
  const panGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      gestureActive.value = true;
    },
    onActive: (event) => {
      // Store translation but don't apply visual feedback
      translateY.value = event.translationY;
    },
    onEnd: (event) => {
      gestureActive.value = false;
      
      const threshold = 80; // Minimum swipe distance
      const velocity = event.velocityY;
      
      let newIndex = currentIndex;
      
      // Determine swipe direction and change index
      if (event.translationY > threshold || velocity > 500) {
        // Swipe down - go to previous (wrap around)
        newIndex = currentIndex > 0 ? currentIndex - 1 : memos.length - 1;
      } else if (event.translationY < -threshold || velocity < -500) {
        // Swipe up - go to next (wrap around)
        newIndex = currentIndex < memos.length - 1 ? currentIndex + 1 : 0;
      }
      
      // Reset translation immediately
      translateY.value = 0;
      
      if (newIndex !== currentIndex) {
        runOnJS(changeIndex)(newIndex);
      }
    },
  });

  // Initialize audio permissions
  useEffect(() => {
    async function requestPermissions() {
      try {
        const permission = await Audio.requestPermissionsAsync();
        if (!permission.granted) {
          console.log('Permission to access audio was denied');
        }
      } catch (error) {
        console.error('Failed to request audio permissions:', error);
      }
    }
    requestPermissions();
  }, []);

  // Simulate live transcription when recording
  useEffect(() => {
    let interval: number;
    if (isRecording) {
      const sampleTranscriptions = [
        'Hello, this is a test...',
        'Hello, this is a test recording...',
        'Hello, this is a test recording for the voice...',
        'Hello, this is a test recording for the voice memo app...',
        'Hello, this is a test recording for the voice memo app. Today we are...',
        'Hello, this is a test recording for the voice memo app. Today we are discussing the new features...',
      ];
      
      let index = 0;
      interval = setInterval(() => {
        if (index < sampleTranscriptions.length) {
          setLiveTranscription(sampleTranscriptions[index]);
          index++;
        }
      }, 1000);
    } else {
      setLiveTranscription('');
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Enhanced audio visualization with metering
  useEffect(() => {
    let meteringInterval: number;
    
    if (isRecording && recording) {
      // Enable audio metering
      recording.setProgressUpdateInterval(50); // Update every 50ms for smooth animation
      
      const updateVisualizer = async () => {
        const SMOOTHING_FACTOR = 0.6; // Controls responsiveness (lower = more smoothing)
        const MIN_AMPLITUDE = 0.3;
        const MAX_AMPLITUDE = 0.8;
        const PEAK_HOLD_DECAY = 0.05; // Decay for falling peaks
      
        try {
          const status = await recording.getStatusAsync();
      
          if (status.isRecording && status.metering !== undefined) {
            const dbLevel = Math.max(-60, Math.min(0, status.metering));
            const amplitude = Math.pow(10, dbLevel / 20) * 2; // Boosted linear amplitude
      
            const now = Date.now();
      
            visualizerBars.forEach((bar, index) => {
              const waveOffset = Math.sin((now * 0.008) + (index * 0.35)) * 0.25;
              const randomVariation = (Math.random() - 0.5) * 0.3;
      
              const frequencyProfile = Math.sin((index / visualizerBars.length) * Math.PI) * 0.8 + 0.2;
      
              let target = amplitude * frequencyProfile + waveOffset + randomVariation;
      
              // Clamp and smooth
              target = Math.max(MIN_AMPLITUDE, Math.min(MAX_AMPLITUDE, target));
              
              // Simple smoothing without accessing private properties
              bar.value = withTiming(target, { duration: 80 });
            });
          }
        } catch (error) {
          console.log('Error getting audio status:', error);
      
          // Fallback animation: dynamic wave simulation
          const now = Date.now();
      
          visualizerBars.forEach((bar, index) => {
            const wave = Math.sin((now * 0.004) + index * 0.25) * 0.5 + 0.5;
            const flutter = (Math.sin(now * 0.01 + index) * 0.2 + 0.2) * Math.random();
            const target = Math.max(MIN_AMPLITUDE, Math.min(MAX_AMPLITUDE, wave + flutter));
            bar.value = withTiming(target, { duration: 100 });
          });
        }
      };
      

      // Start metering updates
      meteringInterval = setInterval(updateVisualizer, 50);
      
      return () => {
        if (meteringInterval) clearInterval(meteringInterval);
      };
    } else {
      // Reset bars to default when not recording
      visualizerBars.forEach(bar => {
        bar.value = withTiming(0.3, { duration: 300 });
      });
    }
  }, [isRecording, recording]);

  const handleRecordPress = async () => {
    if (!isRecording) {
      // Start recording
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording: newRecording } = await Audio.Recording.createAsync({
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          isMeteringEnabled: true, // Enable audio level metering
        });
        setRecording(newRecording);
        setIsRecording(true);
        console.log('Recording started');

      recordButtonOpacity.value = withRepeat(
        withTiming(0.8, { duration: 1000 }),
        -1,
        true
      );
      recordButtonScale.value = withRepeat(
        withTiming(1.1, { duration: 1000 }),
        -1,
        true
      );
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    } else {
      // Stop recording
      try {
        if (recording) {
          await recording.stopAndUnloadAsync();
          setRecording(null);
        }
        setIsRecording(false);
        console.log('Recording stopped');

      recordButtonOpacity.value = withTiming(1);
      recordButtonScale.value = withTiming(1);
      } catch (error) {
        console.error('Failed to stop recording:', error);
      }
    }
  };

  const handlePlayPress = (memoId: string) => {
    setMemos(prev =>
      prev.map(memo =>
        memo.id === memoId
          ? { ...memo, isPlaying: !memo.isPlaying }
          : { ...memo, isPlaying: false }
      )
    );
  };

  const slideToNext = () => {
    // Infinite scroll: wrap to beginning when reaching end
    const nextIndex = currentIndex < memos.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(nextIndex);
    // Smooth scroll to next item
    flatListRef.current?.scrollToIndex({
      index: nextIndex,
      animated: true,
    });
  };

  const slideToPrev = () => {
    // Infinite scroll: wrap to end when going before beginning
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : memos.length - 1;
    setCurrentIndex(prevIndex);
    // Smooth scroll to previous item
    flatListRef.current?.scrollToIndex({
      index: prevIndex,
      animated: true,
    });
  };

  // Handle carousel scroll events
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      if (newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const recordButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: recordButtonScale.value }],
      opacity: recordButtonOpacity.value,
    };
  });

  const CircularProgress = ({ 
    memo,
    index,
    isMain = false,
  }: { 
    memo: Memo;
    index: number;
    isMain?: boolean;
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

      return {
        transform: [
          { translateY: circlePositions[index].value },
          { scale: circleScales[index].value },
        ],
        opacity: circleOpacities[index].value,
        zIndex: zIndex,
      };
    });

    // Audio Visualizer for first circle
    const AudioVisualizerBorder = () => {
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
            <AudioVisualizerBorder />
            
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

  // Simplified Audio Visualizer Component for record button
  const AudioVisualizer = () => {
    return (
      <View style={styles.visualizerContainer}>
        <View style={styles.recordVisualizerRing} />
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />
          
          <View style={styles.header}>
            {/* Old title - slides out */}
            <Animated.View style={[
              styles.titleContainer,
              useAnimatedStyle(() => ({
                transform: [{ translateY: oldTitleTranslateY.value }],
                opacity: oldTitleOpacity.value,
              }))
            ]}>
              <Text style={styles.title}>{previousTitle}</Text>
            </Animated.View>
            
            {/* New title - slides in */}
            <Animated.View style={[
              styles.titleContainer,
              useAnimatedStyle(() => ({
                transform: [{ translateY: newTitleTranslateY.value }],
                opacity: newTitleOpacity.value,
              }))
            ]}>
              <Text style={styles.title}>{displayTitle}</Text>
            </Animated.View>
          </View>
          
          <View style={styles.circlesContainer}>
            <PanGestureHandler onGestureEvent={panGestureHandler}>
              <Animated.View style={styles.gestureContainer}>
                {memos.map((memo, index) => (
                  <CircularProgress 
                    key={memo.id}
                    memo={memo}
                    index={index}
                    isMain={index === currentIndex}
                  />
                ))}
              </Animated.View>
            </PanGestureHandler>
          </View>
        </SafeAreaView>

        {/* Curved Record Section */}
        <View style={styles.recordSection}>
          <View style={styles.topCurvedSection} />
          <View style={styles.leftCurvedSection} />
          <View style={styles.leftCurvedSectionBar} />
          <View style={styles.rightCurvedSection} />
          <View style={styles.rightCurvedSectionBar} />
          <View style={styles.bottomRectSection} />
          
          <View style={styles.recordButtonWrapper}>
            <AudioVisualizer />
              <AnimatedTouchableOpacity
                onPress={handleRecordPress}
                style={[
                  styles.recordButton,
                  recordButtonAnimatedStyle,
                ]}
              >
                <View style={styles.recordButtonInner} />
              </AnimatedTouchableOpacity>
          </View>
          
          <View style={styles.instructionWrapper}>
            <Text style={styles.recordInstruction}>Hold to record a new memo</Text>
          </View>
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingTop: 0,
    paddingBottom: 5, // Reduced from 10 to decrease margin
    alignItems: 'center',
  },
  title: {
    fontSize: 84,
    fontWeight: Platform.OS === 'android' ? '900' : '800',
    textAlign: 'center',
    color: '#000000',
    letterSpacing: -0.5,
    lineHeight: 80,
    marginTop: Platform.OS === 'android' ? 70 : 20,
  },
  titleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circlesContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 200,
    marginTop: Platform.OS === 'android' ? -400 : -200,
  },
  circleContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    // Force square aspect ratio to ensure perfect circles
    aspectRatio: 1,
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
        borderWidth: 1,
        borderColor: '#E5E5EA',
        // Force hardware acceleration for smooth circles
        renderToHardwareTextureAndroid: true,
        // Ensure consistent rendering
        shouldRasterizeIOS: true,
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
  recordSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    alignItems: 'center',
  },
  topCurvedSection: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -60,
    height: 200,
    width: 120,
    backgroundColor: '#000000',
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
  },
  bottomRectSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: '#000000',
  },
  leftCurvedSection: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    width: 60,
    height: 60,
    backgroundColor: '#F2F2F7',
    borderBottomLeftRadius: 50,
    zIndex: 100,
  },
  leftCurvedSectionBar: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    width: 60,
    height: 60,
    backgroundColor: '#000000',
    borderTopRightRadius: 100,
  },
  rightCurvedSection: {
    position: 'absolute',
    bottom: 120,
    right: 0,
    width: 60,
    height: 60,
    backgroundColor: '#F2F2F7',
    borderBottomRightRadius: 50,
    zIndex: 100,
  },
  rightCurvedSectionBar: {
    position: 'absolute',
    bottom: 120,
    right: 0,
    width: 60,
    height: 60,
    backgroundColor: '#000000',
    borderTopLeftRadius: 100,
  },
  recordButtonWrapper: {
    position: 'absolute',
    top: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF3B30',
  },
  instructionWrapper: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  recordInstruction: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E8E93',
    textAlign: 'center',
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
  visualizerBar: {
    width: 2,
    backgroundColor: '#FF3B30',
    borderRadius: 1,
  },
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
  recordVisualizerRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  gestureContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default VoiceMemosScreen;