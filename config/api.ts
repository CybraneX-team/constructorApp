// API Configuration
const API_CONFIG = {
  // Your deployed backend URL on Render
  BASE_URL: __DEV__ 
    ? 'http://localhost:3000'  // Development URL
    : 'https://construction-backend-publ.onrender.com',  // Production URL on Render
  
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
