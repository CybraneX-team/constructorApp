import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { API_BASE_URL } from '../utils/apiConfig';

interface NetworkConnectivityCheckProps {
  onNetworkStatusChange?: (isConnected: boolean) => void;
}

const NetworkConnectivityCheck: React.FC<NetworkConnectivityCheckProps> = ({ 
  onNetworkStatusChange 
}) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [serverReachable, setServerReachable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsConnected(connected);
      onNetworkStatusChange?.(connected);
      
      if (connected) {
        checkServerConnectivity();
      } else {
        setServerReachable(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const checkServerConnectivity = async () => {
    setIsChecking(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/health`, { 
        timeout: 5000 
      });
      setServerReachable(response.status === 200);
    } catch (error) {
      console.error('Server connectivity check failed:', error);
      setServerReachable(false);
    } finally {
      setIsChecking(false);
    }
  };

  if (isConnected === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No Internet Connection</Text>
        <Text style={styles.message}>
          Please check your internet connection and try again.
        </Text>
      </View>
    );
  }

  if (serverReachable === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Server Unreachable</Text>
        <Text style={styles.message}>
          Unable to connect to the server. Please try again later.
        </Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={checkServerConnectivity}
          disabled={isChecking}
        >
          <Text style={styles.retryButtonText}>
            {isChecking ? 'Checking...' : 'Retry'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ff6b6b',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  message: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
});

export default NetworkConnectivityCheck;

