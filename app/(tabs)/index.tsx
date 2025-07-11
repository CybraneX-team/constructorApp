import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, Text } from 'react-native';

export default function HomeScreen() {
  useEffect(() => {
    // Redirect to main screen immediately
    router.replace('/main');
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Loading Voice Memos...</Text>
    </View>
  );
}
