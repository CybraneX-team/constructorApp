
// API Configuration for different environments
const getApiBaseUrl = (): string => {
  // Default fallback URL for production
  const defaultUrl = 'http://13.203.216.38:3000';
  
  if (__DEV__) {
    // Development environment - Backend server URL
    // Make sure your backend is running on this IP and port
    if (!process.env.EXPO_PUBLIC_BACKEND_URL) {
      console.warn('EXPO_PUBLIC_BACKEND_URL not found, using default URL');
      return defaultUrl;
    }
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  } else {
    // Production environment
    if (!process.env.EXPO_PUBLIC_BACKEND_URL) {
      console.warn('EXPO_PUBLIC_BACKEND_URL not found in production, using default URL');
      return defaultUrl;
    }
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }
};

export const API_BASE_URL = getApiBaseUrl();

// Previous configuration (commented out):
// iOS Simulator: http://localhost:3000
// Android: http://10.108.175.191:3000
// Fixed: Changed from exp://10.108.168.18:8081 to http://172.18.128.1:3000
