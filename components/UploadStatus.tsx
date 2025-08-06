import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface UploadStatusProps {
  isUploading: boolean;
  progress: number;
  isVisible: boolean;
}

export const UploadStatus: React.FC<UploadStatusProps> = ({
  isUploading,
  progress,
  isVisible,
}) => {
  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isVisible ? 1 : 0, { duration: 300 }),
      transform: [
        {
          translateY: withSpring(isVisible ? 0 : 50, {
            damping: 20,
            stiffness: 300,
          }),
        },
      ],
    };
  });

  const progressBarStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(`${progress}%`, { duration: 300 }),
    };
  });

  if (!isVisible) return null;

  return (
    <Animated.View style={[containerStyle]}>
      <ThemedView
        style={{
          position: 'absolute',
          bottom: 100,
          left: 20,
          right: 20,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderRadius: 12,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          zIndex: 1000,
        }}
      >
        {isUploading && (
          <ActivityIndicator
            size="small"
            color="#007AFF"
            style={{ marginRight: 12 }}
          />
        )}
        
        <View style={{ flex: 1 }}>
          <ThemedText
            style={{
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: '600',
              marginBottom: 4,
              zIndex: 100,

            }}
          >
            {isUploading ? 'Uploading recording...' : 'Upload complete!'}
          </ThemedText>
          
          {isUploading && (
            <View
              style={{
                height: 4,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 2,
                overflow: 'hidden',
                zIndex: 100,
              }}
            >
              <Animated.View
                style={[
                  progressBarStyle,
                  {
                    height: '100%',
                    backgroundColor: '#007AFF',
                    borderRadius: 2,
                  },
                ]}
              />
            </View>
          )}
          
          {isUploading && (
            <ThemedText
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: 12,
                marginTop: 2,
              }}
            >
              {Math.round(progress)}% complete
            </ThemedText>
          )}
        </View>
      </ThemedView>
    </Animated.View>
  );
};
