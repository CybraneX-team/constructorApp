// API Configuration
const API_CONFIG = {
  // New Rust backend URL
  BASE_URL: 'http://98.80.71.172:3000',
  
  // API endpoints - Updated for Rust backend
  ENDPOINTS: {
    RECORDINGS_SAVE: '/recording/upload',
    RECORDINGS: '/recording/day-logs',
    SEARCH: '/recording/search',
    TRANSCRIPTIONS: '/recording/day',
    LOGIN: '/auth/signin',
    SIGNUP: '/auth/signup',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    HEALTH: '/health'
  }
};

export default API_CONFIG;
