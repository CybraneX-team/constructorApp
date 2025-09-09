import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './apiConfig';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor to add token to all requests
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // If the error is 401, the user needs to login again
    if (error.response?.status === 401) {
      console.log('Unauthorized access - user needs to login again');
      // Clear stored auth data
      try {
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('user');
      } catch (storageError) {
        console.error('Error clearing auth data:', storageError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
