import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSite } from '../contexts/SiteContext';
import { cacheService, CachedProgressData } from '../services/cacheService';
import { useJobProgress } from './useJobProgress';
import { useVoiceMemos } from './useVoiceMemos';

export interface CircularProgressData {
  workProgress: any;
  recordingsCount: number;
  recordingsData: any[];
  isLoading: boolean;
  isFirstTime: boolean;
  refreshData: () => Promise<void>;
  updateCache: () => Promise<void>;
}

export const useCircularProgressData = (): CircularProgressData => {
  const { token } = useAuth();
  const { selectedSite } = useSite();
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [cachedData, setCachedData] = useState<CachedProgressData | null>(null);

  // Get job progress and recordings data
  const { jobProgress, refreshProgress } = useJobProgress(selectedSite?.siteId || 'CFX 417-151');
  const { recordsList, fetchRecordings } = useVoiceMemos();

  // Check if it's first time login
  useEffect(() => {
    const checkFirstTime = async () => {
      const isFirst = await cacheService.isFirstTimeLogin();
      setIsFirstTime(isFirst);
      console.log(' First time login check:', isFirst);
    };
    checkFirstTime();
  }, []);

  // Load initial data (cached or fresh)
  const loadInitialData = useCallback(async () => {
    if (!token || !selectedSite?.siteId) return;

    setIsLoading(true);
    console.log(' Loading initial circular progress data...');

    try {
      // Try to get cached data first
      const cached = await cacheService.getCachedProgressData(selectedSite.siteId);
      
      if (cached && !isFirstTime) {
        // Use cached data for non-first-time logins
        console.log(' Using cached data for circular progress');
        setCachedData(cached);
        setIsLoading(false);
        return;
      }

      // For first time or no cache, load fresh data
      console.log(' Loading fresh data for circular progress');
      
                // Load essential data for circular progress (work progress first, recordings in background)
          const progressResult = await refreshProgress();
          
          // Load recordings data in background for caching (don't wait for it)
          fetchRecordings().then(() => {
            console.log(' Recordings data loaded in background for caching');
          }).catch(error => {
            console.error(' Background recordings load failed:', error);
          });

          // Get recordings count and data (will be updated when background load completes)
          const recordingsCount = recordsList?.length || 0;
          const recordingsData = recordsList || [];

          const freshData: CachedProgressData = {
            workProgress: progressResult,
            recordingsCount,
            recordingsData,
            lastUpdated: new Date().toISOString(),
            siteId: selectedSite.siteId,
          };

      // Cache the fresh data
      await cacheService.setCachedProgressData(freshData);
      setCachedData(freshData);

      // Mark first time login as complete
      if (isFirstTime) {
        await cacheService.setFirstTimeLoginComplete();
        setIsFirstTime(false);
      }

    } catch (error) {
      console.error(' Error loading initial data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedSite?.siteId, isFirstTime, refreshProgress, recordsList?.length]);

  // Refresh data (for manual refresh)
  const refreshData = useCallback(async () => {
    if (!token || !selectedSite?.siteId) return;

    console.log(' Refreshing circular progress data...');
    
    try {
      const [progressResult] = await Promise.all([
        refreshProgress(),
        fetchRecordings(), // Load full recordings for refresh
      ]);

                    const recordingsCount = recordsList?.length || 0;
              const recordingsData = recordsList || [];

              const freshData: CachedProgressData = {
                workProgress: progressResult,
                recordingsCount,
                recordingsData,
                lastUpdated: new Date().toISOString(),
                siteId: selectedSite.siteId,
              };

      await cacheService.setCachedProgressData(freshData);
      setCachedData(freshData);

    } catch (error) {
      console.error(' Error refreshing data:', error);
    }
  }, [token, selectedSite?.siteId, refreshProgress, fetchRecordings, recordsList?.length]);

  // Update cache when recordings change
  const updateCache = useCallback(async () => {
    if (!selectedSite?.siteId || !cachedData) return;

    const recordingsCount = recordsList?.length || 0;
    const recordingsData = recordsList || [];

    // Update if count changed or recordings data is now available
    if (recordingsCount !== cachedData.recordingsCount || 
        (recordingsData.length > 0 && (!cachedData.recordingsData || cachedData.recordingsData.length === 0))) {
      console.log(' Updating cache - recordings count changed:', cachedData.recordingsCount, '->', recordingsCount);
      
      const updatedData: CachedProgressData = {
        ...cachedData,
        recordingsCount,
        recordingsData,
        lastUpdated: new Date().toISOString(),
      };

      await cacheService.setCachedProgressData(updatedData);
      setCachedData(updatedData);
    }
  }, [selectedSite?.siteId, cachedData, recordsList?.length, recordsList]);

  // Load initial data when component mounts or site changes
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Update cache when recordings list changes
  useEffect(() => {
    updateCache();
  }, [updateCache]);

            return {
            workProgress: cachedData?.workProgress || jobProgress,
            recordingsCount: cachedData?.recordingsCount || 0,
            recordingsData: cachedData?.recordingsData || [],
            isLoading,
            isFirstTime,
            refreshData,
            updateCache,
          };
};
