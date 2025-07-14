import React from 'react';
import { Text, StyleSheet, Platform } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

interface AnimatedTitleProps {
  title: string;
  titleTranslateY: Animated.SharedValue<number>;
  titleOpacity: Animated.SharedValue<number>;
}

export const AnimatedTitle: React.FC<AnimatedTitleProps> = ({
  title,
  titleTranslateY,
  titleOpacity,
}) => {
  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleTranslateY.value }],
    opacity: titleOpacity.value,
  }));

  return (
    <Animated.View style={[styles.header, titleStyle]}>
      <Text style={styles.title}>{title}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
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
}); 