import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../utils/apiConfig';
import { Colors } from '../constants/Colors';

const NetworkTest: React.FC = () => {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Not tested');

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('Testing...');

    try {
      console.log('Testing connection to:', API_BASE_URL);
      
      // Try to make a simple request to the server
      const response = await axios.get(`${API_BASE_URL}/health`, {
        timeout: 5000, // 5 second timeout
      });
      
      setConnectionStatus('✅ Connected successfully');
      Alert.alert('Success', 'Successfully connected to backend!');
    } catch (error: any) {
      console.error('Connection test failed:', error);
      
      let errorMessage = 'Connection failed';
      if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        errorMessage = '❌ Network error - Backend not reachable';
      } else if (error.response?.status === 404) {
        errorMessage = '⚠️ Backend connected but /health endpoint not found';
      } else {
        errorMessage = `❌ Error: ${error.message}`;
      }
      
      setConnectionStatus(errorMessage);
      Alert.alert('Connection Test Failed', errorMessage);
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Network Diagnostics</Text>
      <Text style={styles.url}>Backend URL: {API_BASE_URL}</Text>
      <Text style={styles.status}>Status: {connectionStatus}</Text>
      
      <TouchableOpacity 
        style={[styles.button, isTestingConnection && styles.disabledButton]} 
        onPress={testConnection}
        disabled={isTestingConnection}
      >
        <Text style={styles.buttonText}>
          {isTestingConnection ? 'Testing...' : 'Test Connection'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    margin: 20,
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 10,
  },
  url: {
    fontSize: 14,
    color: Colors.light.icon,
    marginBottom: 5,
  },
  status: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 15,
  },
  button: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default NetworkTest;
