import { AudioRecorder, setAudioModeAsync, useAudioRecorder, requestRecordingPermissionsAsync } from 'expo-audio';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions } from 'react-native';
import {
  runOnJS,
  useAnimatedGestureHandler,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Memo, RecordDetail } from '../components/types';
import { recordingService } from '../services/recordingService';
import { getDetailedRecord, initialMemos, initialRecordsList } from '../utils/recordsData';
import { useAuth } from '../contexts/AuthContext';

const screenHeight = Dimensions.get('window').height;

export const useVoiceMemos = () => {
  // Get authentication context
  const { token } = useAuth();
  
  // Initialize audio recorder at the top level (following Rules of Hooks)
  const audioRecorder = useAudioRecorder({
    extension: '.m4a',
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    android: {
      extension: '.m4a',
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
    },
    ios: {
      extension: '.m4a',
      outputFormat: 'mpeg4aac',
      audioQuality: 96,
    },
    web: {
      mimeType: 'audio/webm;codecs=opus',
      bitsPerSecond: 128000,
    },
  });
  
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liveTranscription, setLiveTranscription] = useState('');
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(32).fill(0));
  const [showRecordsList, setShowRecordsList] = useState(false);
  const [showRecordDetail, setShowRecordDetail] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RecordDetail | null>(null);
  const [memos, setMemos] = useState<Memo[]>(initialMemos);
  const [recordsList, setRecordsList] = useState(initialRecordsList);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Animation values
  const recordButtonScale = useSharedValue(1);
  const recordButtonOpacity = useSharedValue(1);
  const titleTranslateY = useSharedValue(0);
  const titleOpacity = useSharedValue(1);
  const visualizerBars = Array.from({ length: 128 }, () => useSharedValue(0.3));
  const translateY = useSharedValue(0);
  const gestureActive = useSharedValue(false);
  const circleTransition = useSharedValue(0);
  const isTransitioning = useSharedValue(false);
  const circlePositions = Array.from({ length: initialMemos.length }, () => useSharedValue(0));
  const circleScales = Array.from({ length: initialMemos.length }, () => useSharedValue(1));
  const circleOpacities = Array.from({ length: initialMemos.length }, () => useSharedValue(1));
  const recordsButtonScale = useSharedValue(1);
  const recordsListScale = useSharedValue(0);
  const recordsListOpacity = useSharedValue(0);
  const recordsBackdropOpacity = useSharedValue(0);
  const recordDetailScale = useSharedValue(0);
  const recordDetailOpacity = useSharedValue(0);
  const recordDetailBackdropOpacity = useSharedValue(0);
  const searchOverlayTranslateY = useSharedValue(screenHeight);
  const searchOverlayOpacity = useSharedValue(0);

  // Get current title based on active circle and recording state
  const getCurrentTitle = () => {
    const currentMemo = memos[currentIndex];
    if (currentIndex === 0) {
      // For the first circle, show different text based on recording state
      return isRecording ? 'CAPTURE\nNOW' : 'WORK\nPROGRESS';
    }
    return currentMemo.title.toUpperCase().replace('\\n', ' ');
  };

  // Function to animate circles to their new positions
  const animateCirclesToNewPositions = useCallback((newIndex: number) => {
    let newVisualOrder: number[] = [];
    
    if (newIndex === 0) {
      newVisualOrder = [0, 1, 2];
    } else if (newIndex === 1) {
      newVisualOrder = [1, 2, 0];
    } else if (newIndex === 2) {
      newVisualOrder = [2, 0, 1];
    }

    memos.forEach((_, index) => {
      const newVisualPosition = newVisualOrder.indexOf(index);
      const targetPosition = newVisualPosition * 160;
      
      let targetScale, targetOpacity;
      if (index === newIndex) {
        targetScale = 1;
        targetOpacity = 1;
      } else {
        const distance = newVisualPosition;
        targetScale = Math.max(0.75, 1 - distance * 0.1);
        targetOpacity = Math.max(0.85, 1 - distance * 0.05);
      }

      const delay = newVisualPosition * 50;
      
      const animateCircle = () => {
        circlePositions[index].value = withTiming(targetPosition, { duration: 600 });
        circleScales[index].value = withSpring(targetScale, {
          damping: 15,
          stiffness: 300,
        });
        circleOpacities[index].value = withTiming(targetOpacity, { duration: 400 });
      };

      if (delay > 0) {
        setTimeout(animateCircle, delay);
      } else {
        animateCircle();
      }
    });
  }, [memos, circlePositions, circleScales, circleOpacities]);

  // Function to change index
  const changeIndex = (newIndex: number) => {
    if (newIndex !== currentIndex && !isTransitioning.value) {
      isTransitioning.value = true;
      setCurrentIndex(newIndex);
      animateCirclesToNewPositions(newIndex);
      setTimeout(() => {
        isTransitioning.value = false;
      }, 700);
    }
  };

  // Function for smooth circle click transitions
  const handleCircleClick = (newIndex: number) => {
    if (newIndex !== currentIndex && !isTransitioning.value) {
      isTransitioning.value = true;
      setCurrentIndex(newIndex);
      animateCirclesToNewPositions(newIndex);
      setTimeout(() => {
        isTransitioning.value = false;
      }, 700);
    }
  };

  // Pan gesture handler for swipe navigation
  const panGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      gestureActive.value = true;
    },
    onActive: (event) => {
      translateY.value = event.translationY;
    },
    onEnd: (event) => {
      gestureActive.value = false;
      
      const threshold = 80;
      const velocity = event.velocityY;
      
      let newIndex = currentIndex;
      
      if (event.translationY > threshold || velocity > 500) {
        newIndex = currentIndex > 0 ? currentIndex - 1 : memos.length - 1;
      } else if (event.translationY < -threshold || velocity < -500) {
        newIndex = currentIndex < memos.length - 1 ? currentIndex + 1 : 0;
      }
      
      translateY.value = 0;
      
      if (newIndex !== currentIndex) {
        runOnJS(changeIndex)(newIndex);
      }
    },
  });

  // Records management functions
  const handleAccessRecords = () => {
    if (!showRecordsList) {
      setShowRecordsList(true);
      
      recordsButtonScale.value = withSpring(1.1, {
        damping: 20,
        stiffness: 500,
      });
      
      recordsBackdropOpacity.value = withTiming(1, { duration: 150 });
      recordsListScale.value = withSpring(1, {
        damping: 25,
        stiffness: 600,
      });
      recordsListOpacity.value = withTiming(1, { duration: 200 });
    }
  };

  const handleCloseRecords = () => {
    recordsListOpacity.value = withTiming(0, { duration: 200 });
    recordsListScale.value = withSpring(0, {
      damping: 20,
      stiffness: 400,
    });
    recordsBackdropOpacity.value = withTiming(0, { duration: 300 }, () => {
      recordsButtonScale.value = withSpring(1, {
        damping: 15,
        stiffness: 300,
      });
      runOnJS(setShowRecordsList)(false);
    });
  };

  const handleRecordClick = (recordId: string) => {
    const detailedRecord = getDetailedRecord(recordId);
    setSelectedRecord(detailedRecord);
    setShowRecordDetail(true);
    
    recordDetailBackdropOpacity.value = withTiming(1, { duration: 200 });
    recordDetailScale.value = withSpring(1, {
      damping: 20,
      stiffness: 400,
    });
    recordDetailOpacity.value = withTiming(1, { duration: 300 });
  };

  const handleCloseRecordDetail = () => {
    recordDetailOpacity.value = withTiming(0, { duration: 200 });
    recordDetailScale.value = withSpring(0.8, {
      damping: 15,
      stiffness: 300,
    });
    recordDetailBackdropOpacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(setShowRecordDetail)(false);
      runOnJS(setSelectedRecord)(null);
    });
  };

  // Search overlay functions
  const handleSearchPress = () => {
    setShowSearchOverlay(true);
    // Ultra-smooth entrance with custom spring physics
    searchOverlayTranslateY.value = withSpring(0, {
      damping: 35,
      stiffness: 150,
      mass: 1.5,
    });
    // Gradual opacity fade-in
    searchOverlayOpacity.value = withTiming(1, { duration: 800 });
  };

  const handleCloseSearch = () => {
    // Dramatic exit animation
    searchOverlayTranslateY.value = withSpring(screenHeight, {
      damping: 40,
      stiffness: 200,
      mass: 1.2,
    });
    searchOverlayOpacity.value = withTiming(0, { duration: 600 }, () => {
      runOnJS(setShowSearchOverlay)(false);
    });
  };

  // Audio recording functions
  const handleRecordPress = async () => {
    if (!isRecording) {
      try {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });

        // Use the audioRecorder from the top level
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
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
        Alert.alert('Recording Error', 'Failed to start recording. Please check your permissions.');
      }
    } else {
      try {
        await audioRecorder.stop();
        const uri = audioRecorder.uri;
        const status = audioRecorder.getStatus();
        
        console.log('Recording stopped');
        console.log('Recording status:', status);
        console.log('Recording URI:', uri);
        
        if (uri) {
          // Start upload process
          setIsUploading(true);
          setUploadProgress(0);
          
          const uploadResult = await uploadRecording(audioRecorder);
          
          if (uploadResult.success) {
            Alert.alert('Success', 'Recording uploaded successfully!');
            // Add the new recording to the records list
            const newRecord = {
              id: uploadResult.recordingId || `rec_${Date.now()}`,
              title: 'New Recording',
              duration: formatDuration(status.durationMillis || 0),
              date: new Date().toLocaleString(),
              jobNumber: 'CFX 417-151', // This should come from app context/settings
              type: 'Voice Memo'
            };
            setRecordsList(prev => [newRecord, ...prev]);
          } else {
            Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload recording');
          }
          
          setIsUploading(false);
          setUploadProgress(0);
        } else {
          console.log('No recording URI available');
          Alert.alert('Recording Error', 'No recording was saved. Please try again.');
        }
        
        setIsRecording(false);

        recordButtonOpacity.value = withTiming(1);
        recordButtonScale.value = withTiming(1);
      } catch (error) {
        console.error('Failed to stop recording:', error);
        Alert.alert('Recording Error', 'Failed to stop recording properly.');
        setIsRecording(false);
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  };

  // Upload recording function
  const uploadRecording = async (recordingToUpload: AudioRecorder) => {
    try {
      const status = recordingToUpload.getStatus();
      const duration = status.durationMillis || 0;
      
      // Update the live recording memo with actual duration
      const formattedDuration = formatDuration(duration);
      setMemos(prev => prev.map(memo => 
        memo.id === '1' 
          ? { ...memo, duration: formattedDuration }
          : memo
      ));

      const result = await recordingService.uploadRecordingAsJSON(recordingToUpload, {
        title: 'Voice Recording',
        jobNumber: 'CFX 417-151', // This should come from app context/settings
        type: 'Voice Memo',
        transcription: liveTranscription || undefined,
      }, token || undefined);

      return result;
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  };

  // Helper function to format duration
  const formatDuration = (durationMs: number): string => {
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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

  // Initialize audio permissions
  useEffect(() => {
    async function requestPermissions() {
      try {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted) {
          console.log('Permission to access audio was denied');
        } else {
          console.log('Audio recording permission granted');
        }
      } catch (error) {
        console.error('Failed to request audio permissions:', error);
      }
    }
    requestPermissions();
  }, []);

  // Animate title change when currentIndex or recording state changes
  useEffect(() => {
    titleOpacity.value = withTiming(0, {
      duration: 150,
    }, () => {
      titleTranslateY.value = -30;
      
      titleTranslateY.value = withSpring(0, {
        damping: 20,
        stiffness: 400,
        mass: 0.6,
      });
      
      titleOpacity.value = withTiming(1, {
        duration: 300,
      });
    });
  }, [currentIndex, isRecording, titleOpacity, titleTranslateY]);

  // Initialize circle positions on mount
  useEffect(() => {
    animateCirclesToNewPositions(currentIndex);
  }, [animateCirclesToNewPositions, currentIndex]);

  // Simulate live transcription when recording
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
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

  // Enhanced audio visualization (simplified for expo-audio)
  useEffect(() => {
    let meteringInterval: ReturnType<typeof setInterval>;
    
    if (isRecording) {
      const updateVisualizer = () => {
        const MIN_AMPLITUDE = 0.3;
        const MAX_AMPLITUDE = 0.8;
        const now = Date.now();
      
        visualizerBars.forEach((bar, index) => {
          const waveOffset = Math.sin((now * 0.008) + (index * 0.35)) * 0.25;
          const randomVariation = (Math.random() - 0.5) * 0.3;
      
          const frequencyProfile = Math.sin((index / visualizerBars.length) * Math.PI) * 0.8 + 0.2;
      
          // Simulate audio levels since expo-audio doesn't provide metering yet
          const baseAmplitude = 0.6 + Math.sin(now * 0.003) * 0.2;
          let target = baseAmplitude * frequencyProfile + waveOffset + randomVariation;
      
          target = Math.max(MIN_AMPLITUDE, Math.min(MAX_AMPLITUDE, target));
          
          bar.value = withTiming(target, { duration: 80 });
        });
      };

      meteringInterval = setInterval(updateVisualizer, 50);
      
      return () => {
        if (meteringInterval) clearInterval(meteringInterval);
      };
    } else {
      visualizerBars.forEach(bar => {
        bar.value = withTiming(0.3, { duration: 300 });
      });
    }
  }, [isRecording, visualizerBars]);

  return {
    // State
    isRecording,
    currentIndex,
    liveTranscription,
    recorder: audioRecorder, // Use audioRecorder instead of the old recorder state
    audioLevels,
    showRecordsList,
    showRecordDetail,
    showSearchOverlay,
    selectedRecord,
    memos,
    recordsList,
    isUploading,
    uploadProgress,
    
    // Animation values
    recordButtonScale,
    recordButtonOpacity,
    titleTranslateY,
    titleOpacity,
    visualizerBars,
    translateY,
    gestureActive,
    circleTransition,
    isTransitioning,
    circlePositions,
    circleScales,
    circleOpacities,
    recordsButtonScale,
    recordsListScale,
    recordsListOpacity,
    recordsBackdropOpacity,
    recordDetailScale,
    recordDetailOpacity,
    recordDetailBackdropOpacity,
    searchOverlayTranslateY,
    searchOverlayOpacity,
    
    // Functions
    getCurrentTitle,
    animateCirclesToNewPositions,
    changeIndex,
    handleCircleClick,
    panGestureHandler,
    handleAccessRecords,
    handleCloseRecords,
    handleRecordClick,
    handleCloseRecordDetail,
    handleRecordPress,
    handlePlayPress,
    handleSearchPress,
    handleCloseSearch,
    uploadRecording,
    formatDuration,
  };
}; 