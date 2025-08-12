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

// Response interceptor to handle token refresh and errors
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const currentToken = await AsyncStorage.getItem('authToken');
        if (currentToken) {
          // Try to refresh the token
          const refreshResponse = await axios.post(
            `${API_BASE_URL}/refresh`,
            {},
            {
              headers: {
                Authorization: `Bearer ${currentToken}`,
              },
            }
          );

          const { token: newToken } = refreshResponse.data;
          
          if (newToken) {
            // Save new token
            await AsyncStorage.setItem('authToken', newToken);
            
            // Update the authorization header for the failed request
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            
            // Retry the original request
            return axiosInstance(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Token refresh failed, user needs to login again
        // The logout will be handled by the component that catches this error
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
