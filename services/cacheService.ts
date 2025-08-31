import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CachedProgressData {
  workProgress: any;
  recordingsCount: number;
  recordingsData: any[];
  lastUpdated: string;
  siteId: string;
}

export interface CacheService {
  getCachedProgressData: (siteId: string) => Promise<CachedProgressData | null>;
  setCachedProgressData: (data: CachedProgressData) => Promise<void>;
  clearCache: () => Promise<void>;
  isFirstTimeLogin: () => Promise<boolean>;
  setFirstTimeLoginComplete: () => Promise<void>;
}

const CACHE_KEYS = {
  PROGRESS_DATA: 'circular_progress_cache',
  FIRST_TIME_LOGIN: 'first_time_login',
};

export const cacheService: CacheService = {
  async getCachedProgressData(siteId: string): Promise<CachedProgressData | null> {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEYS.PROGRESS_DATA);
      if (cachedData) {
        const parsedData: CachedProgressData = JSON.parse(cachedData);
        
        // Check if cache is for the same site and not too old (24 hours)
        const isSameSite = parsedData.siteId === siteId;
        const isNotExpired = new Date().getTime() - new Date(parsedData.lastUpdated).getTime() < 24 * 60 * 60 * 1000;
        
        if (isSameSite && isNotExpired) {
          console.log('📦 Using cached progress data for site:', siteId);
          return parsedData;
        } else {
          console.log('📦 Cache expired or different site, will fetch fresh data');
        }
      }
      return null;
    } catch (error) {
      console.error('📦 Error reading cache:', error);
      return null;
    }
  },

  async setCachedProgressData(data: CachedProgressData): Promise<void> {
    try {
      const cacheData = {
        ...data,
        lastUpdated: new Date().toISOString(),
      };
      await AsyncStorage.setItem(CACHE_KEYS.PROGRESS_DATA, JSON.stringify(cacheData));
                console.log('📦 Cached progress data for site:', data.siteId, 'Recordings:', data.recordingsCount, 'Data items:', data.recordingsData?.length || 0);
    } catch (error) {
      console.error('📦 Error writing cache:', error);
    }
  },

  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.PROGRESS_DATA);
      console.log('📦 Cache cleared');
    } catch (error) {
      console.error('📦 Error clearing cache:', error);
    }
  },

  async isFirstTimeLogin(): Promise<boolean> {
    try {
      const hasLoggedIn = await AsyncStorage.getItem(CACHE_KEYS.FIRST_TIME_LOGIN);
      return !hasLoggedIn;
    } catch (error) {
      console.error('📦 Error checking first time login:', error);
      return true; // Assume first time if error
    }
  },

  async setFirstTimeLoginComplete(): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.FIRST_TIME_LOGIN, 'true');
      console.log('📦 First time login marked as complete');
    } catch (error) {
      console.error('📦 Error setting first time login:', error);
    }
  },
};
