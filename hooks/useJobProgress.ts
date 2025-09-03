import { useCallback, useEffect, useState } from 'react';
import { jobProgressService, ProcessedJobProgress } from '../services/jobProgressService';

// Global request cache to prevent duplicate calls
const requestCache = new Map<string, Promise<ProcessedJobProgress>>();

interface UseJobProgressResult {
  jobProgress: ProcessedJobProgress | null;
  loading: boolean;
  error: string | null;
  refreshProgress: () => Promise<void>;
}

export const useJobProgress = (jobNumber?: string, token?: string): UseJobProgressResult => {
  const [jobProgress, setJobProgress] = useState<ProcessedJobProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobProgress = useCallback(async (forceJobNumber?: string) => {
    const currentJobNumber = forceJobNumber || jobNumber;
    
    if (!currentJobNumber) {
      // Use mock data if no job number provided (for development/testing)
      setJobProgress(jobProgressService.getMockJobProgress());
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const cacheKey = `${currentJobNumber}-${token || 'no-token'}`;
      let request = requestCache.get(cacheKey);
      if (!request) {
        request = jobProgressService.getJobProgress(currentJobNumber, token);
        requestCache.set(cacheKey, request);
      }
      const progress = await request;
      requestCache.delete(cacheKey);
      setJobProgress(progress);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job progress';
      setError(errorMessage);
      console.error('❌ Error fetching job progress:', err);
    } finally {
      setLoading(false);
    }
  }, [jobNumber, token]);

  const refreshProgress = useCallback(async () => {
    await fetchJobProgress();
  }, [fetchJobProgress]);

  useEffect(() => {
    fetchJobProgress();
  }, [fetchJobProgress]);

  return {
    jobProgress,
    loading,
    error,
    refreshProgress,
  };
};

// Hook specifically for using mock data during development
export const useJobProgressMock = (): UseJobProgressResult => {
  const [jobProgress, setJobProgress] = useState<ProcessedJobProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const refreshProgress = useCallback(async () => {
    setLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setJobProgress(jobProgressService.getMockJobProgress());
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  return {
    jobProgress,
    loading,
    error,
    refreshProgress,
  };
};
