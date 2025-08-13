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
import { useVoiceMemos } from '../hooks/useVoiceMemos';
import * as ImagePicker from 'expo-image-picker';
import MediaOptionsModal from '../components/MediaOptionsModal';
import DescriptionPrompt from '../components/DescriptionPrompt';

const VoiceMemosScreen = () => {
  const {
    isRecording,
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
    handleRecordPress,
    handlePlayPress,
    handleSearchPress,
    handleCloseSearch,
  } = useVoiceMemos();

  const currentTitle = React.useMemo(() => getCurrentTitle(), [getCurrentTitle]);

  useEffect(() => {
    console.log(Dimensions.get('window'));
  }, []);
  
  // Media capture/pick state
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [showDescriptionPrompt, setShowDescriptionPrompt] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const requestPermissions = async () => {
    try {
      console.log('🔐 Requesting camera and media library permissions...');
      
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      console.log('📷 Camera permission status:', cam.status);
      
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('📚 Media library permission status:', lib.status);
      
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
      
      console.log('✅ All permissions granted');
      return true;
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      Alert.alert('Permission Error', 'Failed to request permissions. Please try again.');
      return false;
    }
  };

  const openMediaOptions = async () => {
    try {
      console.log('📱 Opening media options...');
      const ok = await requestPermissions();
      if (!ok) {
        console.log('❌ Permissions not granted, aborting');
        return;
      }
      console.log('✅ Permissions granted, showing media options');
      console.log('📱 Setting showMediaOptions to true');
      setShowMediaOptions(true);
    } catch (error) {
      console.error('❌ Error in openMediaOptions:', error);
      Alert.alert('Error', 'Failed to open media options. Please try again.');
    }
  };

  const handleCapture = async () => {
    try {
      console.log('📷 Launching camera...');
      
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
      
      console.log('📷 Camera result:', result);
      
      if (!result.canceled && result.assets?.length) {
        const uris = result.assets.map((a) => a.uri);
        console.log('✅ Images captured:', uris.length);
        setSelectedImages((prev) => [...prev, ...uris]);
        showDescriptionPromptSafely();
      } else {
        console.log('📷 Camera cancelled or no assets');
      }
    } catch (e) {
      console.error('❌ Camera error:', e);
      Alert.alert('Camera Error', `Failed to open camera: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handlePick = async () => {
    try {
      console.log('📚 Launching image picker...');
      
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        selectionLimit: 0,
        quality: 0.85,
      });
      
      console.log('📚 Picker result:', result);
      
      if (!result.canceled && result.assets?.length) {
        const uris = result.assets.map((a) => a.uri);
        console.log('✅ Images selected:', uris.length);
        setSelectedImages((prev) => [...prev, ...uris]);
        showDescriptionPromptSafely();
      } else {
        console.log('📚 Picker cancelled or no assets');
      }
    } catch (e) {
      console.error('❌ Picker error:', e);
      Alert.alert('Picker Error', `Failed to open image picker: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleCloseMediaOptions = () => {
    console.log('❌ Closing media options modal');
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

  const handleMoveToSearchCircle = () => {
    // "Search Records" is index 2 in initial memos
    if (currentIndex !== 2) handleCircleClick(2);
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
                      liveTranscription={liveTranscription}
                      recordsButtonScale={recordsButtonScale}
                      handleAccessRecords={handleAccessRecords}
                      handlePlayPress={handlePlayPress}
                      handleCircleClick={handleCircleClick}
                      handleSearchPress={handleSearchPress}
                    />
                  ))}
                </Animated.View>
              </PanGestureHandler>
            </View>
          </SafeAreaView>

          <RecordButton
            onPress={handleRecordPress}
            recordButtonScale={recordButtonScale}
            recordButtonOpacity={recordButtonOpacity}
            onSearchPress={handleSearchPress}
            onMoveToSearchCircle={handleMoveToSearchCircle}
            onCameraPress={openMediaOptions}
          />

          {showRecordsList && (
            <RecordsList
              records={recordsList}
              onClose={handleCloseRecords}
              listScale={recordsListScale}
              listOpacity={recordsListOpacity}
              backdropOpacity={recordsBackdropOpacity}
              onRecordClick={handleRecordClick}
            />
          )}

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
