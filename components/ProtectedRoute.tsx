import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/Colors';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      // User is not authenticated, redirect to login
      router.replace('/login');
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: Colors.light.background 
      }}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={{ 
          marginTop: 20, 
          fontSize: 16, 
          color: Colors.light.text 
        }}>
          Loading...
        </Text>
      </View>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
};

export default ProtectedRoute;
