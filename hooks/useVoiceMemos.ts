import { AudioRecorder, setAudioModeAsync, useAudioRecorder, requestRecordingPermissionsAsync } from 'expo-audio';
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
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
import { initialMemos } from '../utils/recordsData';
import { useAuth } from '../contexts/AuthContext';
import { useSite } from '../contexts/SiteContext';
import { config } from '../config/app.config';
import { customAlert } from '../services/customAlertService';

// and fall back to estimating from file size and configured bit rate.

const screenHeight = Dimensions.get('window').height;

// Helper function for circle change haptic feedback
const triggerCircleChangeHaptic = () => {
  if (Platform.OS === 'ios') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } else if (Platform.OS === 'android') {
    Vibration.vibrate(25); // Very subtle vibration for circle change
  }
};

export const useVoiceMemos = (options?: { 
  onUploadSuccess?: (message: string) => void;
  onRefreshProgress?: () => Promise<void>;
  onDeleteSuccess?: (message: string) => void;
}) => {
  // Get authentication context
  const { token, user } = useAuth();
  
  // Get selected site context
  const { selectedSite } = useSite();
  
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
  const [isSaving, setIsSaving] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liveTranscription, setLiveTranscription] = useState('');
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(32).fill(0));
  const [showRecordsList, setShowRecordsList] = useState(false);
  const [showRecordDetail, setShowRecordDetail] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RecordDetail | null>(null);
  const [memos, setMemos] = useState<Memo[]>(initialMemos);
  const [recordsList, setRecordsList] = useState<any[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [pendingRecording, setPendingRecording] = useState<{
    audioRecorder: AudioRecorder;
    duration: number;
    title: string;
  } | null>(null);

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

  // Fetch recordings from backend - simple and clean
  const fetchRecordings = useCallback(async () => {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] 📂 FETCH_START - Getting recordings for site: ${selectedSite?.site_id}`);
    
    if (!token) {
      console.log(`[${new Date().toISOString()}] ⚠️ FETCH_SKIP - No auth token available`);
      return;
    }
    
    if (!selectedSite?.id) {
      console.log(`[${new Date().toISOString()}] ⚠️ FETCH_SKIP - No site selected`);
      setRecordsList([]);
      return;
    }
    
    setIsLoadingRecords(true);
    
    try {
      const res = await recordingService.getAllRecordings(token, selectedSite?.id);
      const duration = Date.now() - startTime;
      
      if (res.success) {
        const dayRecordings = res.dayRecordings || [];
        
        // No need to filter since backend already filters by job_id
        // Map to UI format
        const mapped = dayRecordings.map(mapBackendRecordingToListItem);
        
        console.log(`[${new Date().toISOString()}] ✅ FETCH_SUCCESS - ${duration}ms - Total: ${mapped.length} recordings`);
        
        setRecordsList(mapped);
      } else {
        console.log(`[${new Date().toISOString()}] ⚠️ FETCH_FAILED - ${duration}ms - API Error: ${res.error}`);
        setRecordsList([]);
        
        // Show user-friendly error if API fails
        if (res.error?.includes('timeout')) {
          // Handle timeout error from service
          console.error('Request timed out - this suggests backend performance issues');
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] ❌ FETCH_ERROR - ${duration}ms - ${error}`);
      setRecordsList([]);
      
      // Log specific error types for debugging
      if (error instanceof TypeError && error.message === 'Network request failed') {
        console.error('Network request failed - check backend connectivity');
      } else if (error instanceof Error && error.name === 'AbortError') {
        console.error('Request was aborted due to timeout (15s)');
      }
    } finally {
      setIsLoadingRecords(false);
      
      // Log API performance stats periodically
      const { apiMonitor } = await import('../services/apiMonitor');
      apiMonitor.logStats();
    }
  }, [token, selectedSite]);

  // Removed auto-fetch - recordings now loaded only when modal opens

  // Delete record function
  const deleteRecord = useCallback(async (recordId: string) => {
    if (!token) {
      console.log(`[${new Date().toISOString()}] ⚠️ DELETE_SKIP - No auth token`);
      return { success: false, error: 'No authentication token available' };
    }

    // Check if user has admin privileges OR is the owner/contributor of the recording
    const isAdmin = user?.role === 'admin';
    
    if (!isAdmin) {
      // For non-admin users, check if they are the owner or contributor
      try {
        // Fetch the day log details to check ownership/contributorship
        const dayLogResponse = await fetch(`${config.backend.baseUrl}/recording/day/${encodeURIComponent(recordId)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });
        
        if (dayLogResponse.ok) {
          const dayLogData = await dayLogResponse.json();
          const contributors = dayLogData.contributors || [];
          const createdBy = dayLogData.created_by;
          const userEmail = user?.email;
          
          // Check if user is the creator or a contributor
          const isOwner = createdBy === userEmail;
          const isContributor = contributors.includes(userEmail);
          
          if (!isOwner && !isContributor) {
            console.log(`[${new Date().toISOString()}] ⚠️ DELETE_SKIP - User is not owner/contributor, cannot delete record`);
            return { 
              success: false, 
              error: 'You can only delete recordings that you created or contributed to. Please contact your admin to delete this recording.' 
            };
          }
        } else {
          console.log(`[${new Date().toISOString()}] ⚠️ DELETE_SKIP - Could not verify ownership, denying delete`);
          return { 
            success: false, 
            error: 'Could not verify ownership of this recording. Please contact your admin to delete this recording.' 
          };
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ DELETE_OWNERSHIP_CHECK - Error checking ownership:`, error);
        return { 
          success: false, 
          error: 'Could not verify ownership of this recording. Please contact your admin to delete this recording.' 
        };
      }
    }

    console.log(`[${new Date().toISOString()}] 🗑️ DELETE_REQUEST - ${recordId}`);
    
    try {
      const result = await recordingService.deleteRecording(recordId, token);
      
      if (result.success) {
        // Remove the deleted record from the local state
        setRecordsList(prevRecords => 
          prevRecords.filter(record => record.id !== recordId)
        );
        
        console.log(`[${new Date().toISOString()}] ✅ DELETE_LOCAL_UPDATE - Removed ${recordId} from list`);
        
        // Trigger success callback
        if (options?.onDeleteSuccess) {
          options.onDeleteSuccess(result.message || 'Recording deleted successfully');
        }
        
        // Optionally refresh progress data since deleting a recording might affect progress
        if (options?.onRefreshProgress) {
          options.onRefreshProgress();
        }
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete recording';
      console.log(`[${new Date().toISOString()}] ❌ DELETE_FAILED - ${recordId} - ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }, [token, user, options]);

  // Simple site change handler - clear records when site changes
  useEffect(() => {
    console.log(`[${new Date().toISOString()}] 🏢 SITE_CHANGE - ${selectedSite?.site_id || 'none'}`);
    // Clear records when site changes - they will be loaded on demand when modal opens
    setRecordsList([]);
  }, [selectedSite?.site_id]);

  // Get current title based on active circle and recording state
  const getCurrentTitle = () => {
    const currentMemo = memos[currentIndex];
    if (currentIndex === 0) {
      // For the first circle, show different text based on state
      if (isRecording || isSaving) return 'CAPTURE\nNOW';
      // Only show WORK PROGRESS when not recording or saving
      return 'WORK\nPROGRESS';
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
      // Note: Haptic feedback is handled by the calling function (pan gesture handler)
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
      triggerCircleChangeHaptic(); // Add subtle haptic feedback for circle change
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
        runOnJS(triggerCircleChangeHaptic)(); // Add haptic feedback for swipe navigation
        runOnJS(changeIndex)(newIndex);
      }
    },
  });

  // Records management functions - clean and simple
  const handleAccessRecords = async () => {
    console.log(`[${new Date().toISOString()}] 📂 MODAL_OPEN - Opening records modal`);

    if (!showRecordsList) {
      setShowRecordsList(true);
      
      // Start modal animations
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
      
      // Fetch recordings immediately when modal opens
      if (recordsList.length === 0 && !isLoadingRecords) {
        console.log(`[${new Date().toISOString()}] 📂 FETCH_TRIGGER - No data cached, fetching now`);
        fetchRecordings();
      } else if (recordsList.length > 0) {
        console.log(`[${new Date().toISOString()}] 📂 DATA_CACHED - Using ${recordsList.length} cached records`);
      }
    }
  };

  const handleCloseRecords = () => {
    console.log('📂 handleCloseRecords called');
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
    const base = recordsList.find(r => r.id === recordId);
    const skeleton = createEmptyRecordDetailFromListItem(base);
    setSelectedRecord(skeleton);
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
    searchOverlayTranslateY.value = withSpring(0, {
      damping: 35,
      stiffness: 150,
      mass: 1.5,
    });
    searchOverlayOpacity.value = withTiming(1, { duration: 800 });
  };

  const handleCloseSearch = () => {
    searchOverlayTranslateY.value = withSpring(screenHeight, {
      damping: 40,
      stiffness: 200,
      mass: 1.2,
    });
    searchOverlayOpacity.value = withTiming(0, { duration: 600 }, () => {
      runOnJS(setShowSearchOverlay)(false);
    });
  };

  // Helper: build today's title prefix like AUG-20-2025
  const getTodayTitlePrefix = () => {
    const d = new Date();
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const mm = months[d.getMonth()];
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}-${dd}-${yyyy}`;
  };

  // Helper: compute next per-day index by scanning existing recordsList titles
  const getNextDailyIndex = (prefix: string) => {
    let maxIdx = 0;
    try {
      for (const r of recordsList) {
        if (typeof r?.title === 'string' && r.title.startsWith(prefix + '_')) {
          const parts = r.title.split('_');
          const maybeNum = parts[1];
          const n = parseInt(maybeNum, 10);
          if (!isNaN(n)) maxIdx = Math.max(maxIdx, n);
        }
      }
    } catch {}
    return maxIdx + 1;
  };

  // Audio recording functions - split into start and stop for hold-to-record
  const handleStartRecording = async () => {
    if (isRecording) return; // Already recording
    
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
      customAlert.error('Recording Error', 'Failed to start recording. Please check your permissions.');
    }
  };

  const handleStopRecording = async () => {
    if (!isRecording) return; // Not recording
    
    try {
      await audioRecorder.stop();
      const status = audioRecorder.getStatus();
      
      // Stop recording state but don't set saving yet
      setIsRecording(false);
      
      // Reset button animations immediately
      recordButtonOpacity.value = withTiming(1);
      recordButtonScale.value = withTiming(1);
      
      console.log('Recording stopped');
      console.log('Recording status:', status);
      console.log('Recording URI:', audioRecorder.uri);
      
      if (audioRecorder.uri) {
        // Try to read duration again after a short delay (recorder may not flush immediately)
        let actualDurationMs = status.durationMillis || 0;
        try {
          await new Promise(res => setTimeout(res, 200));
          const status2 = audioRecorder.getStatus();
          if (status2.durationMillis && status2.durationMillis > 0) {
            actualDurationMs = status2.durationMillis;
          }
        } catch {}

        // Fallback: estimate duration from file size and configured bit rate (128 kbps)
        if (!actualDurationMs || actualDurationMs <= 0) {
          try {
            const head = await fetch(audioRecorder.uri as string, { method: 'HEAD' });
            const len = head.headers.get('content-length');
            if (len) {
              const bytes = parseInt(len, 10);
              const bitRate = 128000; // bits per second (from recorder setup)
              const seconds = (bytes * 8) / bitRate;
              actualDurationMs = Math.max(0, Math.round(seconds * 1000));
            }
          } catch {}
        }

        // Update memo UI duration
        const formattedDuration = formatDuration(actualDurationMs || 0);
        setMemos(prev => prev.map(memo => 
          memo.id === '1' 
            ? { ...memo, duration: formattedDuration }
            : memo
        ));

        // Build dynamic title like AUG-20-2025_1
        const prefix = getTodayTitlePrefix();
        const nextIdx = getNextDailyIndex(prefix);
        const generatedTitle = `${prefix}_${nextIdx}`;

        // Store the recording data and show date picker
        setPendingRecording({
          audioRecorder,
          duration: actualDurationMs,
          title: generatedTitle,
        });
        setSelectedDate(new Date()); // Default to today
        setShowDatePicker(true);
        
      } else {
        console.log('No recording URI available');
        customAlert.error('Recording Error', 'No recording was saved. Please try again.');
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      customAlert.error('Recording Error', 'Failed to stop recording properly.');
      setIsRecording(false);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Date picker handlers
  const handleDatePickerClose = () => {
    setShowDatePicker(false);
    setPendingRecording(null);
  };

  const handleDatePickerConfirm = async (selectedDate: Date) => {
    if (!pendingRecording) return;
    
    setShowDatePicker(false);
    setIsSaving(true);
    
    try {
      // Proceed with upload using the selected date
      const job_id = selectedSite?.id || 'CFX 417-151';
      console.log('🎙️ Creating recording with job_id:', job_id, 'from site:', selectedSite?.name);
      console.log('📅 Selected date:', selectedDate.toISOString().split('T')[0]);
      
      const uploadResult = await recordingService.uploadRecordingAsJSON(pendingRecording.audioRecorder, {
        title: pendingRecording.title,
        jobNumber: job_id,
        type: 'Voice Memo',
        transcription: liveTranscription || undefined,
        durationOverrideMs: pendingRecording.duration,
        selectedDate: selectedDate, // Pass the selected date
      }, token || undefined);

      if (uploadResult.success) {
        console.log('  Recording uploaded successfully, refreshing data...');
        
        // Immediately refresh both work progress and daily recordings
        try {
          // Refresh work progress data
          if (options?.onRefreshProgress) {
            console.log('  Refreshing work progress...');
            await options.onRefreshProgress();
          }
          
          // Refresh daily recordings to get the updated consolidated data
          console.log('  Refreshing daily recordings...');
          await fetchRecordings();
          
          console.log('  Data refresh completed');
        } catch (refreshError) {
          console.error('  Failed to refresh data after upload:', refreshError);
          // Continue with success flow even if refresh fails
        }
        
        // Reset saving state and trigger success callback
        setIsSaving(false);
        if (options?.onUploadSuccess) {
          options.onUploadSuccess('  Recording uploaded successfully!');
        }
      } else {
        setIsSaving(false);
        customAlert.error('Upload Failed', uploadResult.error || 'Failed to upload recording');
      }
      
      setPendingRecording(null);
      setIsUploading(false);
      setUploadProgress(0);
    } catch (error) {
      console.error('Failed to upload recording:', error);
      customAlert.error('Upload Error', 'Failed to upload recording properly.');
      setIsSaving(false);
      setPendingRecording(null);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Legacy function for backward compatibility (now calls start recording)
  const handleRecordPress = handleStartRecording;

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

      // Build dynamic title like AUG-20-2025_1
      const prefix = getTodayTitlePrefix();
      const nextIdx = getNextDailyIndex(prefix);
      const generatedTitle = `${prefix}_${nextIdx}`;

      const job_id = selectedSite?.id || 'CFX 417-151'; // Use site ObjectId instead of siteId
      console.log('🎙️ Uploading recording with job_id:', job_id, 'from site:', selectedSite?.name);
      
      const result = await recordingService.uploadRecordingAsJSON(recordingToUpload, {
        title: generatedTitle,
        jobNumber: job_id, // This will be converted to job_id in the service
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

  // Animate title change when currentIndex, recording, or saving state changes
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
  }, [currentIndex, isRecording, isSaving, titleOpacity, titleTranslateY]);

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
    isSaving,
    currentIndex,
    liveTranscription,
    recorder: audioRecorder, // Use audioRecorder instead of the old recorder state
    audioLevels,
    showRecordsList,
    showRecordDetail,
    showSearchOverlay,
    showEmailModal,
    selectedRecord,
    memos,
    recordsList,
    isLoadingRecords,
    isUploading,
    uploadProgress,
    
    // Date picker state
    showDatePicker,
    selectedDate,
    pendingRecording,
    
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
    handleRecordPress, // Legacy - now same as handleStartRecording
    handleStartRecording,
    handleStopRecording,
    handlePlayPress,
    handleSearchPress,
    handleCloseSearch,
    uploadRecording,
    formatDuration,
    fetchRecordings,
    deleteRecord,
    
    // Date picker functions
    handleDatePickerClose,
    handleDatePickerConfirm,
  };
};

function mapBackendRecordingToListItem(dayRecording: any) {
  // The backend returns dayRecordings (consolidated daily recordings), not individual recordings
  // Each dayRecording contains a structuredSummary with the daily work data
  
  const structuredSummary = dayRecording.structuredSummary || {};
  
  // Format duration from totalDuration or structuredSummary duration
  const durationStr = dayRecording.totalDuration || structuredSummary.duration || '00:00';
  
  // Get the actual recording date from backend (local_date field)
  const recordingDate = dayRecording.local_date || dayRecording.date || structuredSummary.date;
  
  // Format the date for display (convert from YYYY-MM-DD to readable format)
  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        month: 'numeric', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch (error) {
      console.warn('Failed to parse date:', dateStr, error);
      return dateStr; // Return original string if parsing fails
    }
  };
  
  // Use the formatted date as the title
  const title = formatDateForDisplay(recordingDate) || 'Unknown Date';
  
  // Format date for display (same as title for consistency)
  const dateStr = formatDateForDisplay(recordingDate) || 'Unknown Date';

  return {
    id: dayRecording.id || `day_${Date.now()}`,
    title: title,
    duration: durationStr,
    date: dateStr,
    jobNumber: dayRecording.jobNumber || structuredSummary.jobNumber || '-',
    type: 'Work Summary', // These are always work summaries since they're consolidated daily recordings
    // Add additional data for the detail view
    structuredSummary: structuredSummary,
    recordingCount: dayRecording.recordingCount || 0,
    totalFileSize: dayRecording.totalFileSize || 0,
    consolidatedSummary: dayRecording.consolidatedSummary || '',
    images: dayRecording.images || [], // Include images from backend
    imageCount: dayRecording.imageCount || 0,
  };
}

function createEmptyRecordDetailFromListItem(item: any): RecordDetail {
  // Format date consistently with the list item mapping
  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        month: 'numeric', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch (error) {
      console.warn('Failed to parse date:', dateStr, error);
      return dateStr; // Return original string if parsing fails
    }
  };
  
  return {
    id: item?.id || `rec_${Date.now()}`,
    title: item?.title || 'Recording',
    duration: item?.duration || '00:00',
    date: formatDateForDisplay(item?.date) || 'Unknown Date',
    jobNumber: item?.jobNumber || '-',
    structuredSummary: item?.structuredSummary, // Include the structuredSummary data
    images: item?.images || [], // Include images from backend
    laborData: {
      manager: { startTime: '', finishTime: '', hours: '0.00', rate: '$-', total: '$-' },
      foreman: { startTime: '', finishTime: '', hours: '0.00', rate: '$-', total: '$-' },
      carpenter: { startTime: '', finishTime: '', hours: '0.00', rate: '$-', total: '$-' },
      skillLaborer: { startTime: '', finishTime: '', hours: '0.00', rate: '$-', total: '$-' },
      carpenterExtra: { startTime: '', finishTime: '', hours: '0.00', rate: '$-', total: '$-' },
    },
    subcontractors: {
      superiorTeamRebar: { employees: 0, hours: 0 },
    },
    dailyActivities: '',
    materialsDeliveries: {
      argosClass4: { qty: '', uom: '', unitRate: '$-', tax: '$-', total: '$-' },
      expansionJoint: { qty: '', uom: '', unitRate: '$-', tax: '$-', total: '$-' },
    },
    equipment: {
      truck: { days: 0, monthlyRate: '$-', itemRate: '$-' },
      equipmentTrailer: { days: 0, monthlyRate: '$-', itemRate: '$-' },
      fuel: { days: 0, monthlyRate: '$-', itemRate: '$-' },
      miniExcavator: { days: 0, monthlyRate: '$-', itemRate: '$-' },
      closedToolTrailer: { days: 0, monthlyRate: '$-', itemRate: '$-' },
      skidStir: { days: 0, monthlyRate: '$-', itemRate: '$-' },
    },
  };
} 