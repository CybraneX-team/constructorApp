import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSite } from '../contexts/SiteContext';
import { CachedProgressData, cacheService } from '../services/cacheService';
import { useJobProgress } from './useJobProgress';
import { useVoiceMemos } from './useVoiceMemos';

export interface CircularProgressData {
  workProgress: any;
  isLoading: boolean;
  isFirstTime: boolean;
  refreshData: () => Promise<void>;
}

export const useCircularProgressData = (): CircularProgressData => {
  const { token } = useAuth();
  const { selectedSite } = useSite();
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  // Get job progress data (site filter optional)
  const { jobProgress, refreshProgress } = useJobProgress(selectedSite?.id, token || undefined);

  // Watchdog: ensure loader never gets stuck
  useEffect(() => {
    if (!isLoading) return;
    const watchdog = setTimeout(() => {
      console.log(`[${new Date().toISOString()}] ⏱️ PROGRESS_WATCHDOG - forcing loader to hide after timeout`);
      setIsLoading(false);
    }, 8000); // 8s safety timeout
    return () => clearTimeout(watchdog);
  }, [isLoading]);

  // Check if it's first time login
  useEffect(() => {
    const checkFirstTime = async () => {
      const isFirst = await cacheService.isFirstTimeLogin();
      setIsFirstTime(isFirst);
      console.log(`[${new Date().toISOString()}] 🔄 FIRST_TIME_CHECK - ${isFirst}`);
    };
    checkFirstTime();
  }, []);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    console.log(`[${new Date().toISOString()}] 🔄 INIT_LOAD_START - Site: ${selectedSite?.id || 'all'}`);

    try {
      await refreshProgress();
      if (isFirstTime) {
        await cacheService.setFirstTimeLoginComplete();
        setIsFirstTime(false);
        console.log(`[${new Date().toISOString()}] ✅ FIRST_TIME_COMPLETE`);
      }
      console.log(`[${new Date().toISOString()}] ✅ INIT_LOAD_SUCCESS`);
    } catch (error) {
      console.log(`[${new Date().toISOString()}] ❌ INIT_LOAD_ERROR - ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedSite?.id, isFirstTime, refreshProgress]);

  // Simple refresh function
  const refreshData = useCallback(async () => {
    if (!token) return;
    console.log(`[${new Date().toISOString()}] 🔄 REFRESH_START`);
    try {
      await refreshProgress();
      console.log(`[${new Date().toISOString()}] ✅ REFRESH_SUCCESS`);
    } catch (error) {
      console.log(`[${new Date().toISOString()}] ❌ REFRESH_ERROR - ${error}`);
    }
  }, [refreshProgress]);

  // Load initial data when component mounts or site changes
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  return {
    workProgress: jobProgress,
    isLoading,
    isFirstTime,
    refreshData,
  };
};
