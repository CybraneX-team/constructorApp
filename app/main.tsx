import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Alert,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import ProtectedRoute from '../components/ProtectedRoute';

// Custom hook and components
import { AnimatedTitle } from '../components/AnimatedTitle';
import CircularProgress from '../components/CircularProgress';
import { RecordButton } from '../components/RecordButton';
import RecordDetailView from '../components/RecordDetailView';
import RecordsList from '../components/RecordsList';
import SearchOverlay from '../components/SearchOverlay';
import { UploadStatus } from '../components/UploadStatus';
import { ToastMessage } from '../components/ToastMessage';
import { useVoiceMemos } from '../hooks/useVoiceMemos';
import * as ImagePicker from 'expo-image-picker';
import MediaOptionsModal from '../components/MediaOptionsModal';
import DescriptionPrompt from '../components/DescriptionPrompt';
import WorkProgressModal from '../components/WorkProgressModal';
import { useModalStack } from '../contexts/ModalStackContext';
import { useSharedValue, withTiming, withSpring } from 'react-native-reanimated';
import { useJobProgress } from '../hooks/useJobProgress';
import RefreshOverlay from '../components/RefreshOverlay';

const VoiceMemosScreen = () => {
  // Fetch job progress data - using the same job number as recordings
  const { jobProgress, loading: jobProgressLoading, error: jobProgressError, refreshProgress } = useJobProgress('CFX 417-151');

  const {
    isRecording,
    isSaving,
    currentIndex,
    liveTranscription,
    showRecordsList,
    showRecordDetail,
    showSearchOverlay,
    selectedRecord,
    memos,
    recordsList,
    isUploading,
    uploadProgress,
    recordButtonScale,
    recordButtonOpacity,
    titleTranslateY,
    titleOpacity,
    visualizerBars,
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
    getCurrentTitle,
    handleCircleClick,
    panGestureHandler,
    handleAccessRecords,
    handleCloseRecords,
    handleRecordClick,
    handleCloseRecordDetail,
    handleRecordPress, // Legacy handler
    handleStartRecording,
    handleStopRecording,
    handlePlayPress,
    handleSearchPress,
    handleCloseSearch,
    fetchRecordings,
  } = useVoiceMemos({ 
    onUploadSuccess: (message: string) => showSuccessToastMessage(message),
    onRefreshProgress: refreshProgress
  });

  const currentTitle = React.useMemo(() => getCurrentTitle(), [getCurrentTitle]);
  const { registerModal, unregisterModal } = useModalStack();

  // Initial data loading when app opens
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        console.log('  Loading initial data...');
        
        // Show refresh overlay for initial loading
        setRefreshMessage('  Loading initial data...');
        setRefreshSuccess(false);
        setShowRefreshOverlay(true);
        
        // Load work progress and recordings in parallel
        await Promise.all([
          refreshProgress(),
          fetchRecordings()
        ]);
        
        console.log('  Initial data loaded successfully');
        
        // Show success state briefly
        setRefreshMessage('  Data loaded successfully!');
        setRefreshSuccess(true);
        
        // Hide overlay after 1 second
        setTimeout(() => {
          setShowRefreshOverlay(false);
        }, 1000);
        
      } catch (error) {
        console.error('  Failed to load initial data:', error);
        
        // Show error state briefly
        setRefreshMessage('  Failed to load initial data');
        setRefreshSuccess(false);
        
        // Hide overlay after 2 seconds
        setTimeout(() => {
          setShowRefreshOverlay(false);
        }, 2000);
      }
    };

    loadInitialData();
  }, [refreshProgress, fetchRecordings]);

  useEffect(() => {
    console.log(Dimensions.get('window'));
  }, []);
  
  // Media capture/pick state
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [showDescriptionPrompt, setShowDescriptionPrompt] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showRefreshOverlay, setShowRefreshOverlay] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'info' | 'success' | 'error' | 'warning'>('info');
  
  // Success toast state
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Work Progress Modal state
  const [showWorkProgressModal, setShowWorkProgressModal] = useState(false);
  const workProgressBackdropOpacity = useSharedValue(0);
  const workProgressModalScale = useSharedValue(0.8);
  const workProgressModalOpacity = useSharedValue(0);

  const requestPermissions = async () => {
    try {
      console.log('  Requesting camera and media library permissions...');
      
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      console.log('  Camera permission status:', cam.status);
      
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('  Media library permission status:', lib.status);
      
      if (cam.status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in your device settings to take photos.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      if (lib.status !== 'granted') {
        Alert.alert(
          'Photos Permission Required', 
          'Please enable photo library access in your device settings to select images.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      console.log('  All permissions granted');
      return true;
    } catch (error) {
      console.error('  Error requesting permissions:', error);
      Alert.alert('Permission Error', 'Failed to request permissions. Please try again.');
      return false;
    }
  };

  const openMediaOptions = async () => {
    try {
      console.log('  Opening media options...');
      const ok = await requestPermissions();
      if (!ok) {
        console.log('  Permissions not granted, aborting');
        return;
      }
      console.log('  Permissions granted, showing media options');
      console.log('  Setting showMediaOptions to true');
      setShowMediaOptions(true);
    } catch (error) {
      console.error('  Error in openMediaOptions:', error);
      Alert.alert('Error', 'Failed to open media options. Please try again.');
    }
  };

  const handleCapture = async () => {
    try {
      console.log('  Launching camera...');
      
      // Check if we're on a simulator
      const isSimulator = Platform.OS === 'ios' && __DEV__;
      if (isSimulator) {
        Alert.alert(
          'Camera Not Available',
          'Camera is not available on simulator. Please use a real device to test camera functionality.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.85,
        exif: false,
      });
      
      console.log('  Camera result:', result);
      
      if (!result.canceled && result.assets?.length) {
        const uris = result.assets.map((a) => a.uri);
        console.log('  Images captured:', uris.length);
        setSelectedImages((prev) => [...prev, ...uris]);
        showDescriptionPromptSafely();
      } else {
        console.log('  Camera cancelled or no assets');
      }
    } catch (e) {
      console.error('  Camera error:', e);
      Alert.alert('Camera Error', `Failed to open camera: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handlePick = async () => {
    try {
      console.log('  Launching image picker...');
      
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        selectionLimit: 0,
        quality: 0.85,
      });
      
      console.log('  Picker result:', result);
      
      if (!result.canceled && result.assets?.length) {
        const uris = result.assets.map((a) => a.uri);
        console.log('  Images selected:', uris.length);
        setSelectedImages((prev) => [...prev, ...uris]);
        showDescriptionPromptSafely();
      } else {
        console.log('  Picker cancelled or no assets');
      }
    } catch (e) {
      console.error('  Picker error:', e);
      Alert.alert('Picker Error', `Failed to open image picker: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleCloseMediaOptions = () => {
    console.log('  Closing media options modal');
    setShowMediaOptions(false);
  };

  const handleDescriptionSubmit = (desc: string) => {
    // TODO: persist images+description to backend when endpoint is ready
    console.log('Images selected:', selectedImages);
    console.log('Description:', desc);
    setSelectedImages([]);
    setShowDescriptionPrompt(false);
    Alert.alert('Saved', 'Images and description saved.');
  };

  // Show description prompt with a tiny delay to avoid overlapping with picker closing animation on Android
  const showDescriptionPromptSafely = () => {
    setTimeout(() => setShowDescriptionPrompt(true), 150);
  };

  // Show toast message
  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  // Hide toast message
  const hideToast = () => {
    setShowToast(false);
  };

  // Show success toast
  const showSuccessToastMessage = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessToast(true);
  };

  // Hide success toast
  const hideSuccessToast = () => {
    setShowSuccessToast(false);
  };

  // Note: Success notifications are now handled directly in the recording process
  // We could add a callback prop to useVoiceMemos if needed for custom notifications

  // Register modals with the modal stack for proper back button handling
  useEffect(() => {
    const id = 'records-list';
    if (showRecordsList) {
      registerModal(id, handleCloseRecords, 80);
    } else {
      unregisterModal(id);
    }
  }, [showRecordsList]);

  useEffect(() => {
    const id = 'record-detail';
    if (showRecordDetail) {
      registerModal(id, handleCloseRecordDetail, 100);
    } else {
      unregisterModal(id);
    }
  }, [showRecordDetail]);

  useEffect(() => {
    const id = 'search-overlay';
    if (showSearchOverlay) {
      registerModal(id, handleCloseSearch, 90);
    } else {
      unregisterModal(id);
    }
  }, [showSearchOverlay]);

  useEffect(() => {
    const id = 'media-options';
    if (showMediaOptions) {
      registerModal(id, handleCloseMediaOptions, 60);
    } else {
      unregisterModal(id);
    }
  }, [showMediaOptions]);

  useEffect(() => {
    const id = 'description-prompt';
    if (showDescriptionPrompt) {
      registerModal(id, () => setShowDescriptionPrompt(false), 70);
    } else {
      unregisterModal(id);
    }
  }, [showDescriptionPrompt]);

  const handleMoveToSearchCircle = () => {
    // "Search Records" is index 2 in initial memos
    if (currentIndex !== 2) handleCircleClick(2);
  };
  
  // Work Progress Modal handlers
  const handleShowWorkProgressModal = () => {
    console.log('🔍 Showing work progress modal from main screen');
    setShowWorkProgressModal(true);
  };
  
  const handleCloseWorkProgressModal = () => {
    setShowWorkProgressModal(false);
  };

  // Handle refresh all data
  const handleRefreshAllData = async () => {
    try {
      console.log('  Refreshing all data...');
      
      // Show refresh overlay
      setRefreshMessage('  Refreshing data...');
      setRefreshSuccess(false);
      setShowRefreshOverlay(true);
      
      // Refresh work progress and recordings in parallel
      await Promise.all([
        refreshProgress(),
        fetchRecordings()
      ]);
      
      console.log('All data refreshed successfully');
      
      // Show success state briefly
      setRefreshMessage('  Data refreshed successfully!');
      setRefreshSuccess(true);
      
      // Hide overlay after 1.5 seconds
      setTimeout(() => {
        setShowRefreshOverlay(false);
      }, 1500);
      
    } catch (error) {
      console.error('  Failed to refresh data:', error);
      
      // Show error state briefly
      setRefreshMessage('  Failed to refresh data');
      setRefreshSuccess(false);
      
      // Hide overlay after 2 seconds
      setTimeout(() => {
        setShowRefreshOverlay(false);
      }, 2000);
    }
  };

  const { height, width } = Dimensions.get('window');
  const isIPhone16 = Platform.OS === 'ios' && height === 852 && width === 393;

  const styles = getStyles(isIPhone16);

  return (
    <ProtectedRoute>
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.container}>
          <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />
            <AnimatedTitle
              title={currentTitle}
              titleTranslateY={titleTranslateY}
              titleOpacity={titleOpacity}
            />
            <View style={styles.circlesContainer}>
              <PanGestureHandler onGestureEvent={panGestureHandler}>
                <Animated.View style={styles.gestureContainer}>
                  {memos.map((memo, index) => (
                    <CircularProgress
                      key={memo.id}
                      memo={memo}
                      index={index}
                      isMain={index === currentIndex}
                      currentIndex={currentIndex}
                      circlePositions={circlePositions}
                      circleScales={circleScales}
                      circleOpacities={circleOpacities}
                      visualizerBars={visualizerBars}
                      isRecording={isRecording}
                      isSaving={isSaving}
                      liveTranscription={liveTranscription}
                      recordsButtonScale={recordsButtonScale}
                      handleAccessRecords={handleAccessRecords}
                      handlePlayPress={handlePlayPress}
                      handleCircleClick={handleCircleClick}
                      handleSearchPress={handleSearchPress}
                      onShowWorkProgressModal={handleShowWorkProgressModal}
                      workProgress={jobProgress || undefined}
                    />
                  ))}
                </Animated.View>
              </PanGestureHandler>
            </View>
          </SafeAreaView>

          <RecordButton
            onPress={() => showToastMessage('  Hold to record!')}
            onPressIn={handleStartRecording}
            onPressOut={handleStopRecording}
            recordButtonScale={recordButtonScale}
            recordButtonOpacity={recordButtonOpacity}
            onSearchPress={handleSearchPress}
            onMoveToSearchCircle={handleMoveToSearchCircle}
            onCameraPress={openMediaOptions}
            onRefreshPress={handleRefreshAllData}
          />

          {(() => {
            console.log('📂 Main screen - showRecordsList:', showRecordsList);
            console.log('📂 Main screen - recordsList length:', recordsList?.length);
            console.log('📂 Main screen - recordsList:', recordsList);
            return showRecordsList && (
              <RecordsList
                records={recordsList}
                onClose={handleCloseRecords}
                listScale={recordsListScale}
                listOpacity={recordsListOpacity}
                backdropOpacity={recordsBackdropOpacity}
                onRecordClick={handleRecordClick}
              />
            );
          })()}

          {showRecordDetail && selectedRecord && (
            <RecordDetailView
              record={selectedRecord}
              onClose={handleCloseRecordDetail}
              detailScale={recordDetailScale}
              detailOpacity={recordDetailOpacity}
              backdropOpacity={recordDetailBackdropOpacity}
            />
          )}

          <SearchOverlay
            isVisible={showSearchOverlay}
            onClose={handleCloseSearch}
            searchOverlayTranslateY={searchOverlayTranslateY}
            searchOverlayOpacity={searchOverlayOpacity}
            records={recordsList}
            onRecordClick={handleRecordClick}
          />

          {/* Media options and description prompt */}
          <MediaOptionsModal
            visible={showMediaOptions}
            onClose={handleCloseMediaOptions}
            onCapture={handleCapture}
            onPick={handlePick}
          />

          <DescriptionPrompt
            visible={showDescriptionPrompt}
            onCancel={() => setShowDescriptionPrompt(false)}
            onSubmit={handleDescriptionSubmit}
          />

          {/* Upload Status */}
          <UploadStatus
            isUploading={isUploading}
            progress={uploadProgress}
            isVisible={isUploading}
          />

          {/* Toast Messages */}
          <ToastMessage
            message={toastMessage}
            isVisible={showToast}
            onHide={hideToast}
            duration={1500}
            position="above-record-button"
          />
          
          {/* Success Toast */}
          <ToastMessage
            message={successMessage}
            isVisible={showSuccessToast}
            onHide={hideSuccessToast}
            duration={3000}
            position="center"
            type="success"
          />
          
          {/* Work Progress Modal */}
          <WorkProgressModal
            visible={showWorkProgressModal}
            workProgress={jobProgress || {
              overallProgress: 0,
              tasksCompleted: 0,
              totalTasks: 0,
              inProgressTasks: 0,
              remainingTasks: [],
              allTasks: [],
              lastUpdated: new Date().toISOString(),
              categories: {},
            }}
            onClose={handleCloseWorkProgressModal}
            onRefresh={refreshProgress}
            loading={jobProgressLoading}
          />

          {/* Refresh Overlay */}
          <RefreshOverlay
            isVisible={showRefreshOverlay}
            message={refreshMessage}
            isSuccess={refreshSuccess}
          />
        </View>
      </GestureHandlerRootView>
    </ProtectedRoute>
  );
};

const getStyles = (isIPhone16: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F2F2F7',
    },
    safeArea: {
      flex: 1,
    },
    circlesContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 200,
      marginTop: isIPhone16
        ? -150
        : Platform.OS === 'android'
        ? -250
        : -200,
    },
    gestureContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default VoiceMemosScreen;
