// API Configuration
const API_CONFIG = {
  // Your deployed backend URL on Render
  BASE_URL: __DEV__ 
    ? 'http://13.203.216.38:3000'  // Development URL
  : process.env.EXPO_PUBLIC_BACKEND_URL,  // Use BACKEND_URL from env
  
  // API endpoints
  ENDPOINTS: {
    RECORDINGS_SAVE: '/recordings/save',
    RECORDINGS: '/recordings',
    SEARCH: '/search',
    TRANSCRIPTIONS: '/transcriptions',
    LOGIN: '/login',
    SIGNUP: '/signup',
    REFRESH: '/refresh',
    HEALTH: '/health'
  }
};

export default API_CONFIG;
