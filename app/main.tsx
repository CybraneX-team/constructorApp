import React, { useEffect } from 'react';
import {
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
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
