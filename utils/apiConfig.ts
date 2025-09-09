
// API Configuration for Rust backend
const getApiBaseUrl = (): string => {
  // New Rust backend URL
  const rustBackendUrl = 'http://98.80.71.172:3000';
  
  // Use the new Rust backend URL for both development and production
  return rustBackendUrl;
};

export const API_BASE_URL = getApiBaseUrl();

// Previous configuration (commented out):
// iOS Simulator: http://localhost:3000
// Android: http://10.108.175.191:3000
// Fixed: Changed from exp://10.108.168.18:8081 to http://172.18.128.1:3000
