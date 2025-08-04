import { Platform } from 'react-native';

// API Configuration for different environments
const getApiBaseUrl = (): string => {
  if (__DEV__) {
    // Development environment - Backend server URL
    // Make sure your backend is running on this IP and port
    return 'https://construction-backend-publ.onrender.com';
  } else {
    // Production environment
    return 'https://construction-backend-publ.onrender.com';
  }
};

export const API_BASE_URL = getApiBaseUrl();

// Previous configuration (commented out):
// iOS Simulator: http://localhost:3000
// Android: http://10.108.175.191:3000
// Fixed: Changed from exp://10.108.168.18:8081 to https://construction-backend-publ.onrender.com
