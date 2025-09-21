
// API Configuration for Rust backend
const getApiBaseUrl = (): string => {
  // Check if we're in development mode (Expo Go)
  const isDevelopment = __DEV__;
  
  // For development (Expo Go), use the local/development URL
  if (isDevelopment) {
    return 'http://98.80.71.172:3000';
  }
  
  // For production builds, use the same URL but with better error handling
  // In a real production app, you'd want to use HTTPS and a proper domain
  const productionUrl = 'http://98.80.71.172:3000';
  
  console.log('API Base URL:', productionUrl, 'Development mode:', isDevelopment);
  return productionUrl;
};

export const API_BASE_URL = getApiBaseUrl();

// Previous configuration (commented out):
// iOS Simulator: http://localhost:3000
// Android: http://10.108.175.191:3000
// Fixed: Changed from exp://10.108.168.18:8081 to http://98.80.71.172:3000
