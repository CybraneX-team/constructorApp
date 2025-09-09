/**
 * Configuration file for the app
 * Contains backend URLs, API endpoints, and other configurable settings
 */

export const config = {
  // Backend Configuration
  backend: {
    // New Rust backend URL
    baseUrl: 'http://98.80.71.172:3000',
    
    // API Endpoints - Updated for Rust backend
    endpoints: {
      recordings: {
        save: '/recording/upload',
        list: '/recording/day-logs',
        get: '/recording/day',
      },
      auth: {
        login: '/auth/signin',
        register: '/auth/signup',
        forgotPassword: '/auth/forgot-password',
        resetPassword: '/auth/reset-password',
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
  
  // For all environments, use the same Rust backend URL
  return {
    ...config,
    backend: {
      ...config.backend,
      baseUrl: 'http://98.80.71.172:3000',
    },
    app: {
      ...config.app,
      debug: env === 'development',
    },
  };
};

export default config;
