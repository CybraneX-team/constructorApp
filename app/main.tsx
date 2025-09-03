import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    View,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import ProtectedRoute from '../components/ProtectedRoute';
import { customAlert, infoHaptic, successHaptic } from '../services/customAlertService';

// Custom hook and components
import * as ImagePicker from 'expo-image-picker';
import { AnimatedTitle } from '../components/AnimatedTitle';
import CircularProgress from '../components/CircularProgress';
import DescriptionPrompt from '../components/DescriptionPrompt';
import MediaOptionsModal from '../components/MediaOptionsModal';
import { RecordButton } from '../components/RecordButton';
import RecordDetailView from '../components/RecordDetailView';
import RecordsList from '../components/RecordsList';
import SearchOverlay from '../components/SearchOverlay';
import { ToastMessage } from '../components/ToastMessage';
import { UploadStatus } from '../components/UploadStatus';
import WorkProgressModal from '../components/WorkProgressModal';
import { useAuth } from '../contexts/AuthContext';
import { useModalStack } from '../contexts/ModalStackContext';
import { useSite } from '../contexts/SiteContext';
import { useVoiceMemos } from '../hooks/useVoiceMemos';

import InitialLoader from '../components/InitialLoader';
import RefreshOverlay from '../components/RefreshOverlay';
import { useCircularProgressData } from '../hooks/useCircularProgressData';
import { useJobProgress } from '../hooks/useJobProgress';
import { imageService } from '../services/imageService';

const VoiceMemosScreen = () => {
  // Get selected site context
  const { selectedSite } = useSite();
  
  // Get authentication token
  const { token } = useAuth();
  
  // Use simplified circular progress data hook
  const {
    workProgress: todayWorkProgress,
    isLoading: circularProgressLoading,
    isFirstTime,
    refreshData: refreshCircularProgress
  } = useCircularProgressData();
  
  // Use only the progress from circular progress hook to avoid duplicate calls
  const refreshProgress = () => refreshCircularProgress();


  
  // Log when selected site changes
  useEffect(() => {
    console.log(`[${new Date().toISOString()}] 🏢 SITE_SELECTED - ${selectedSite?.name} (${selectedSite?.siteId})`);
  }, [selectedSite]);

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
    isLoadingRecords,
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
    deleteRecord,
  } = useVoiceMemos({ 
    onUploadSuccess: (message: string) => showSuccessToastMessage(message),
    onRefreshProgress: refreshProgress,
    onDeleteSuccess: (message: string) => showSuccessToastMessage(message)
  });



  const currentTitle = React.useMemo(() => getCurrentTitle(), [getCurrentTitle]);
  const { registerModal, unregisterModal } = useModalStack();

  // Helper function to format category names
  const formatCategoryName = (category: string): string => {
    return category
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace('Labour', 'Labor');
  };

  // Use cached work progress data from the hook

  // Initial data loading is now handled by useCircularProgressData hook

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

  // Animation effects for WorkProgressModal
  useEffect(() => {
    if (showWorkProgressModal) {
      // Animate modal in
      workProgressBackdropOpacity.value = withTiming(1, { duration: 300 });
      workProgressModalScale.value = withSpring(1, {
        damping: 15,
        stiffness: 300,
        overshootClamping: false,
      });
      workProgressModalOpacity.value = withTiming(1, { duration: 400 });
    } else {
      // Animate modal out
      workProgressBackdropOpacity.value = withTiming(0, { duration: 200 });
      workProgressModalScale.value = withTiming(0.8, { duration: 200 });
      workProgressModalOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [showWorkProgressModal]);

  const requestPermissions = async () => {
    try {
      console.log('  Requesting camera and media library permissions...');
      
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      console.log('  Camera permission status:', cam.status);
      
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('  Media library permission status:', lib.status);
      
      if (cam.status !== 'granted') {
        customAlert.error(
          'Camera Permission Required',
          'Please enable camera access in your device settings to take photos.'
        );
        return false;
      }
      
      if (lib.status !== 'granted') {
        customAlert.error(
          'Photos Permission Required', 
          'Please enable photo library access in your device settings to select images.'
        );
        return false;
      }
      
      console.log('  All permissions granted');
      return true;
    } catch (error) {
      console.error('  Error requesting permissions:', error);
      customAlert.error('Permission Error', 'Failed to request permissions. Please try again.');
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
      customAlert.error('Error', 'Failed to open media options. Please try again.');
    }
  };

  const handleCapture = async () => {
    try {
      console.log('  Launching camera...');
      
      // Check if we're on a simulator
      const isSimulator = Platform.OS === 'ios' && __DEV__;
      if (isSimulator) {
        customAlert.error(
          'Camera Not Available',
          'Camera is not available on simulator. Please use a real device to test camera functionality.'
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
      customAlert.error('Camera Error', `Failed to open camera: ${e instanceof Error ? e.message : String(e)}`);
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
      customAlert.error('Picker Error', `Failed to open image picker: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleCloseMediaOptions = () => {
    console.log('  Closing media options modal');
    setShowMediaOptions(false);
  };

  const handleDescriptionSubmit = async (desc: string) => {
    try {
      if (!selectedSite?.siteId) {
        customAlert.error('No Site Selected', 'Please select a site first to upload images.');
        setSelectedImages([]);
        setShowDescriptionPrompt(false);
        return;
      }

      if (selectedImages.length === 0) {
        customAlert.error('No Images', 'No images selected to upload.');
        setSelectedImages([]);
        setShowDescriptionPrompt(false);
        return;
      }

      console.log('📸 Uploading images for job:', selectedSite.siteId);
      console.log('📸 Images selected:', selectedImages.length);
      console.log('📸 Description:', desc);

      // Show loading state
      setShowDescriptionPrompt(false);
      setShowRefreshOverlay(true);
      setRefreshMessage('Uploading images...');
      setRefreshSuccess(false);

      // First, get the current day recording ID for this job
      const currentRecordingId = await imageService.getCurrentDayRecordingId(selectedSite.siteId, token || undefined);
      console.log('📸 Current day recording ID:', currentRecordingId);

      // Upload each image
      const uploadPromises = selectedImages.map(async (imageUri, index) => {
        console.log(`📸 Uploading image ${index + 1}/${selectedImages.length}:`, imageUri);
        
        const metadata = {
          caption: desc,
          uploadIndex: index + 1,
          totalImages: selectedImages.length,
          uploadedAt: new Date().toISOString(),
        };

        const result = await imageService.uploadImage(
          imageUri,
          selectedSite.siteId,
          metadata,
          token || undefined,
          currentRecordingId || undefined
        );

        if (!result.success) {
          throw new Error(`Failed to upload image ${index + 1}: ${result.error}`);
        }

        return result;
      });

      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(r => r.success).length;

      console.log('📸 Upload completed:', successfulUploads, 'successful out of', selectedImages.length);

      // Refresh data to include new images
      await fetchRecordings();

      // Show success message
      setRefreshMessage(`Successfully uploaded ${successfulUploads} images!`);
      setRefreshSuccess(true);

      // Clear selected images
      setSelectedImages([]);

      // Hide overlay after a delay
      setTimeout(() => {
        setShowRefreshOverlay(false);
      }, 2000);

    } catch (error) {
      console.error('📸 Image upload failed:', error);
      
      setRefreshMessage(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setRefreshSuccess(false);
      
      // Hide overlay after a delay
      setTimeout(() => {
        setShowRefreshOverlay(false);
      }, 3000);

      customAlert.error(
        'Upload Failed', 
        `Failed to upload images: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  // Show description prompt with a tiny delay to avoid overlapping with picker closing animation on Android
  const showDescriptionPromptSafely = () => {
    setTimeout(() => setShowDescriptionPrompt(true), 150);
  };

  // Show toast message
  const showToastMessage = (message: string) => {
    infoHaptic(); // Light haptic for info toast
    setToastMessage(message);
    setShowToast(true);
  };

  // Hide toast message
  const hideToast = () => {
    setShowToast(false);
  };

  // Show success toast
  const showSuccessToastMessage = (message: string) => {
    successHaptic(); // Success haptic for success toast
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
      console.log('🔄 Starting full data refresh...');
      
      // Show refresh overlay
      setRefreshMessage('  Refreshing all data...');
      setRefreshSuccess(false);
      setShowRefreshOverlay(true);
      
      // Use the new cache-aware refresh function
      await refreshCircularProgress();
      
      console.log('🔄 Data refresh completed successfully');
      
      // Show success state
      setRefreshMessage('  Data refresh completed!');
      setRefreshSuccess(true);
      
      // Hide overlay after 1 second
      setTimeout(() => {
        setShowRefreshOverlay(false);
      }, 1000);
      
    } catch (error) {
      console.error('🔄 Error during data refresh:', error);
      
      // Show error state
      setRefreshMessage('  Refresh failed');
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
          {/* Initial Loader for first-time login */}
          <InitialLoader 
            isVisible={isFirstTime && circularProgressLoading}
            message="Loading your workspace..."
          />
          
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
                      key={`memo-${memo.id}-${todayWorkProgress?.lastUpdated || 'no-data'}`}
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
                      workProgress={todayWorkProgress}
                      records={[]} // Records loaded on demand when needed
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
            visualizerBars={visualizerBars}
            onSearchPress={handleSearchPress}
            onMoveToSearchCircle={handleMoveToSearchCircle}
            onCameraPress={openMediaOptions}
            onRefreshPress={handleRefreshAllData}
          />

          {(() => {
            // console.log('📂 Main screen - showRecordsList:', showRecordsList);
            // console.log('📂 Main screen - recordsList length:', recordsList?.length);
            // console.log('📂 Main screen - recordsList:', recordsList);
            return showRecordsList && (
              <RecordsList
                records={recordsList}
                onClose={handleCloseRecords}
                listScale={recordsListScale}
                listOpacity={recordsListOpacity}
                backdropOpacity={recordsBackdropOpacity}
                onRecordClick={handleRecordClick}
                onDeleteRecord={deleteRecord}
                isLoading={isLoadingRecords}
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
            key={`work-progress-${todayWorkProgress?.lastUpdated || 'no-data'}`}
            visible={showWorkProgressModal}
            workProgress={todayWorkProgress}
            onClose={handleCloseWorkProgressModal}
            onRefresh={refreshProgress}
            loading={circularProgressLoading}
            jobNumber={selectedSite?.siteId || 'CFX 417-151'}
            modalScale={workProgressModalScale}
            modalOpacity={workProgressModalOpacity}
            backdropOpacity={workProgressBackdropOpacity}
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
