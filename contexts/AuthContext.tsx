import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';
import axiosInstance from '../utils/axiosConfig';
import { API_BASE_URL } from '../utils/apiConfig';
// We'll use this to access site context from inside auth context
// import { useSite } from './SiteContext';

interface User {
  email: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, superPassword?: string) => Promise<User>;
  signup: (email: string, password: string, isAdmin: boolean, accessKey?: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Set default authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, superPassword?: string): Promise<User> => {
    try {
      const response = await axiosInstance.post('/auth/signin', {
        email,
        password,
        superPassword,
      });

      const { token: newToken, message } = response.data;
      
      // Decode the token to get user info (simple JWT decode)
      const tokenPayload = JSON.parse(atob(newToken.split('.')[1]));
      const userData: User = {
        email: tokenPayload.email,
        role: tokenPayload.role,
      };

      // Store in state
      setToken(newToken);
      setUser(userData);

      // Store in AsyncStorage
      await AsyncStorage.setItem('authToken', newToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      // Set default authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

      return userData;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const signup = async (email: string, password: string, isAdmin: boolean, accessKey?: string) => {
    try {
      console.log('Attempting signup with:', { email, isAdmin, hasAccessKey: !!accessKey, apiUrl: `${API_BASE_URL}/auth/signup` });
      
      const response = await axiosInstance.post('/auth/signup', {
        email,
        password,
        isAdmin,
        accessKey,
      });

      console.log('Signup successful:', response.data);
      // Don't auto-login after signup, let user login manually
      return response.data;
    } catch (error: any) {
      console.error('Signup error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: `${API_BASE_URL}/auth/signup`
      });
      
      if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      }
      
      throw new Error(error.response?.data?.error || 'Signup failed');
    }
  };


  const logout = async () => {
    try {
      console.log('🔄 Logging out user...');
      
      // Clear user state immediately
      setUser(null);
      setToken(null);
      
      // Clear all stored data
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      
      // Clear circular progress cache
      await AsyncStorage.removeItem('circular_progress_cache');
      await AsyncStorage.removeItem('first_time_login');
      
      // Remove default authorization header
      delete axios.defaults.headers.common['Authorization'];
      
      console.log('✅ Logout completed successfully');
      
      // Force immediate redirect to login
      router.replace('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, still redirect to login
      router.replace('/login');
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    signup,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
