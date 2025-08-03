/**
 * Configuration file for the app
 * Contains backend URLs, API endpoints, and other configurable settings
 */

export const config = {
  // Backend Configuration
  backend: {
    // Replace with your actual backend URL
    baseUrl: process.env.EXPO_PUBLIC_BACKEND_URL || 'http://construction-backend-publ.onrender.com:3000',
    
    // API Endpoints
    endpoints: {
      recordings: {
        save: '/recordings/save',
      },
      auth: {
        login: '/auth/login',
        register: '/auth/register',
        refresh: '/auth/refresh',
      },
    },
    
    // Request timeout in milliseconds
    timeout: 30000,
  },

  // Recording Configuration
  recording: {
    // Default job number (should be configurable per user/project)
    defaultJobNumber: 'CFX 417-151',
    
    // Default recording type
    defaultType: 'Voice Memo',
    
    // Maximum file size for uploads (in bytes) - 50MB
    maxFileSizeBytes: 50 * 1024 * 1024,
    
    // Supported audio formats
    supportedFormats: ['m4a', 'wav', 'mp3'],
    
    // Recording quality settings
    quality: {
      sampleRate: 44100,
      channels: 2,
      bitRate: 128000,
    },
  },

  // Upload Configuration
  upload: {
    // Maximum retry attempts for failed uploads
    maxRetries: 3,
    
    // Retry delay in milliseconds
    retryDelay: 2000,
    
    // Chunk size for large file uploads (in bytes) - 1MB
    chunkSizeBytes: 1024 * 1024,
    
    // Whether to use chunked uploads for large files
    useChunkedUpload: true,
  },

  // App Configuration
  app: {
    // App version
    version: '1.0.0',
    
    // Enable debug logging
    debug: __DEV__,
    
    // Default language
    defaultLanguage: 'en',
    
    // Theme settings
    theme: {
      primaryColor: '#007AFF',
      secondaryColor: '#34C759',
    },
  },
};

/**
 * Environment-specific configurations
 */
export const getEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return {
        ...config,
        backend: {
          ...config.backend,
          baseUrl: process.env.EXPO_PUBLIC_BACKEND_URL || 'https://your-production-api.com',
        },
        app: {
          ...config.app,
          debug: false,
        },
      };
    
    case 'staging':
      return {
        ...config,
        backend: {
          ...config.backend,
          baseUrl: process.env.EXPO_PUBLIC_BACKEND_URL || 'https://staging-api.your-domain.com',
        },
      };
    
    default: // development
      return {
        ...config,
        backend: {
          ...config.backend,
          baseUrl: process.env.EXPO_PUBLIC_BACKEND_URL || 'http://construction-backend-publ.onrender.com:3000',
        },
      };
  }
};

export default config;
