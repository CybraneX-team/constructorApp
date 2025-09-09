import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Site {
  id: string;
  name: string;
  site_id: string; // Rust backend uses snake_case
  company_name: string; // Rust backend uses snake_case
  stakeholders: string[];
  is_active: boolean; // Rust backend uses snake_case
  created_by?: string; // Added from Rust backend
  created_at?: string; // Added from Rust backend
}

interface SiteContextType {
  selectedSite: Site | null;
  sites: Site[];
  setSelectedSite: (site: Site) => void;
  setSites: (sites: Site[]) => void;
  addSite: (site: Site) => void;
  clearSiteSelection: () => void;
  isLoading: boolean;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export const useSite = () => {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return context;
};

interface SiteProviderProps {
  children: ReactNode;
}

export const SiteProvider: React.FC<SiteProviderProps> = ({ children }) => {
  const [selectedSite, setSelectedSiteState] = useState<Site | null>(null);
  const [sites, setSitesState] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredSiteData();
  }, []);

  const loadStoredSiteData = async () => {
    try {
      const storedSite = await AsyncStorage.getItem('selectedSite');
      const storedSites = await AsyncStorage.getItem('sites');
      
      if (storedSite) {
        setSelectedSiteState(JSON.parse(storedSite));
      }
      
      if (storedSites) {
        setSitesState(JSON.parse(storedSites));
      }
    } catch (error) {
      console.error('Error loading stored site data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setSelectedSite = async (site: Site) => {
    try {
      setSelectedSiteState(site);
      await AsyncStorage.setItem('selectedSite', JSON.stringify(site));
    } catch (error) {
      console.error('Error storing selected site:', error);
    }
  };

  const setSites = async (newSites: Site[]) => {
    try {
      setSitesState(newSites);
      await AsyncStorage.setItem('sites', JSON.stringify(newSites));
    } catch (error) {
      console.error('Error storing sites:', error);
    }
  };

  const addSite = async (site: Site) => {
    try {
      const updatedSites = [...sites, site];
      setSitesState(updatedSites);
      await AsyncStorage.setItem('sites', JSON.stringify(updatedSites));
    } catch (error) {
      console.error('Error adding site:', error);
    }
  };

  const clearSiteSelection = async () => {
    try {
      setSelectedSiteState(null);
      setSitesState([]);
      await AsyncStorage.removeItem('selectedSite');
      await AsyncStorage.removeItem('sites');
    } catch (error) {
      console.error('Error clearing site selection:', error);
    }
  };

  const value: SiteContextType = {
    selectedSite,
    sites,
    setSelectedSite,
    setSites,
    addSite,
    clearSiteSelection,
    isLoading,
  };

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
};
