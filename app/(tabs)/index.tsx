import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function HomeScreen() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // User is authenticated, redirect to site selection screen
        router.replace('/site-selection');
      } else {
        // User is not authenticated, redirect to login
        router.replace('/login');
      }
    }
  }, [user, isLoading]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' }}>
      <ActivityIndicator size="large" color="#0a7ea4" />
      <Text style={{ marginTop: 20, fontSize: 16, color: '#11181C' }}>Loading Voice Memos...</Text>
    </View>
  );
}
