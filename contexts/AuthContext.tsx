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
  login: (email: string, password: string, accessKey?: string) => Promise<User>;
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
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, accessKey?: string): Promise<User> => {
    try {
      const payload: any = { email, password };
      if (accessKey) payload.access_key = accessKey;

      const response = await axiosInstance.post('/auth/signin', payload);

      const { token: newToken } = response.data;
      const tokenPayload = JSON.parse(atob(newToken.split('.')[1]));
      const normalizedRole = (tokenPayload.role || '').toString().toLowerCase();
      const userData: User = {
        email: tokenPayload.email,
        role: normalizedRole === 'admin' ? 'admin' : 'user',
      };

      setToken(newToken);
      setUser(userData);
      await AsyncStorage.setItem('authToken', newToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      return userData;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const signup = async (email: string, password: string, isAdmin: boolean, accessKey?: string) => {
    try {
      console.log('Attempting signup with:', { email, isAdmin, hasAccessKey: !!accessKey, apiUrl: `${API_BASE_URL}/auth/signup` });
      
      const payload: any = { email, password, is_admin: !!isAdmin };
      if (isAdmin && accessKey) payload.access_key = accessKey;
      
      const response = await axiosInstance.post('/auth/signup', payload);
      console.log('Signup successful:', response.data);
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
      setUser(null);
      setToken(null);
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('circular_progress_cache');
      await AsyncStorage.removeItem('first_time_login');
      delete axios.defaults.headers.common['Authorization'];
      router.replace('/login');
    } catch (error) {
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
