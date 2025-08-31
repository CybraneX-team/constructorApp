import axiosInstance from '../utils/axiosConfig';
import { Site } from '../contexts/SiteContext';

export interface CreateSiteData {
  name: string;
  siteId: string;
  companyName: string;
  stakeholders: string[];
  isActive?: boolean;
}

export interface UpdateSiteData {
  name?: string;
  siteId?: string;
  companyName?: string;
  stakeholders?: string[];
  isActive?: boolean;
}

export interface SitesResponse {
  success: boolean;
  sites: Site[];
  count: number;
  error?: string;
}

export interface SiteResponse {
  success: boolean;
  site: Site;
  error?: string;
}

export interface CreateSiteResponse {
  success: boolean;
  id: string;
  site: Site;
  error?: string;
}

export interface DeleteSiteResponse {
  success: boolean;
  error?: string;
}

class SiteService {
  /**
   * Get all accessible sites
   */
  async getAllSites(): Promise<SitesResponse> {
    try {
      const response = await axiosInstance.get('/sites');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching sites:', error);
      throw error;
    }
  }

  /**
   * Get a specific site by ID
   */
  async getSiteById(siteId: string): Promise<SiteResponse> {
    try {
      const response = await axiosInstance.get(`/sites/${siteId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching site:', error);
      throw error;
    }
  }

  /**
   * Create a new site
   */
  async createSite(siteData: CreateSiteData): Promise<CreateSiteResponse> {
    try {
      const response = await axiosInstance.post('/sites', siteData);
      return response.data;
    } catch (error: any) {
      console.error('Error creating site:', error);
      throw error;
    }
  }

  /**
   * Update an existing site
   */
  async updateSite(siteId: string, siteData: UpdateSiteData): Promise<SiteResponse> {
    try {
      const response = await axiosInstance.put(`/sites/${siteId}`, siteData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating site:', error);
      throw error;
    }
  }

  /**
   * Delete a site
   */
  async deleteSite(siteId: string): Promise<DeleteSiteResponse> {
    try {
      const response = await axiosInstance.delete(`/sites/${siteId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting site:', error);
      throw error;
    }
  }

  /**
   * Find site by job number (for email functionality)
   */
  async findSiteByJobNumber(jobNumber: string): Promise<Site | null> {
    try {
      console.log('🔍 Looking for site with job number:', jobNumber);
      const response = await this.getAllSites();
      if (response.success && response.sites) {
        console.log('🔍 Available sites:', response.sites.map(site => ({
          id: site.id,
          name: site.name,
          siteId: site.siteId,
          companyName: site.companyName,
          stakeholders: site.stakeholders
        })));
        
        const matchingSite = response.sites.find(site => {
          // Try exact match first
          if (site.siteId === jobNumber) {
            console.log(`🔍 Exact match found with siteId: "${site.name}" (${site.siteId})`);
            return true;
          }
          
          // Try partial matches
          const nameMatch = site.name.toLowerCase().includes(jobNumber.toLowerCase());
          const companyMatch = site.companyName.toLowerCase().includes(jobNumber.toLowerCase());
          const siteIdPartial = site.siteId.toLowerCase().includes(jobNumber.toLowerCase());
          
          const matches = nameMatch || companyMatch || siteIdPartial;
          console.log(`🔍 Checking site "${site.name}" (${site.siteId}): name=${nameMatch}, company=${companyMatch}, siteId=${siteIdPartial} => ${matches ? 'MATCH' : 'no match'}`);
          return matches;
        });
        
        if (matchingSite) {
          console.log('🔍 Found matching site:', {
            id: matchingSite.id,
            name: matchingSite.name,
            siteId: matchingSite.siteId,
            stakeholders: matchingSite.stakeholders
          });
        } else {
          console.log('🔍 No matching site found for job number:', jobNumber);
        }
        
        return matchingSite || null;
      }
      return null;
    } catch (error: any) {
      console.error('Error finding site by job number:', error);
      return null;
    }
  }

  /**
   * Validate stakeholder emails
   */
  validateStakeholderEmails(emails: string[]): { valid: string[]; invalid: string[] } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid: string[] = [];
    const invalid: string[] = [];

    emails.forEach(email => {
      const trimmedEmail = email.trim();
      if (trimmedEmail && emailRegex.test(trimmedEmail)) {
        valid.push(trimmedEmail);
      } else if (trimmedEmail) {
        invalid.push(trimmedEmail);
      }
    });

    return { valid, invalid };
  }

  /**
   * Parse stakeholder emails from text
   */
  parseStakeholderEmails(text: string): string[] {
    return text
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);
  }

  /**
   * Check if a site has stakeholders configured for email
   */
  async hasStakeholdersForJob(jobNumber: string): Promise<{ hasStakeholders: boolean; stakeholderCount: number; site?: Site }> {
    try {
      console.log('📧 Checking stakeholders for job:', jobNumber);
      const site = await this.findSiteByJobNumber(jobNumber);
      
      if (!site) {
        console.log('📧 No site found for job:', jobNumber);
        return { hasStakeholders: false, stakeholderCount: 0 };
      }

      console.log('📧 Site found:', {
        id: site.id,
        name: site.name,
        siteId: site.siteId,
        stakeholders: site.stakeholders
      });

      const hasStakeholders = site.stakeholders && site.stakeholders.length > 0;
      const stakeholderCount = hasStakeholders ? site.stakeholders.length : 0;

      console.log('📧 Stakeholder check result:', {
        hasStakeholders,
        stakeholderCount,
        stakeholders: site.stakeholders
      });

      return {
        hasStakeholders,
        stakeholderCount,
        site: site // Return the site even if it has no stakeholders for better UX
      };
    } catch (error: any) {
      console.error('Error checking stakeholders:', error);
      return { hasStakeholders: false, stakeholderCount: 0 };
    }
  }

  /**
   * Create a default site for a job number if none exists
   */
  async createDefaultSiteForJob(jobNumber: string, defaultStakeholders: string[] = []): Promise<Site | null> {
    try {
      console.log('🏗️ Creating default site for job:', jobNumber);
      
      const siteData: CreateSiteData = {
        name: `Job ${jobNumber}`,
        siteId: jobNumber,
        companyName: 'Default Company',
        stakeholders: defaultStakeholders,
        isActive: true
      };

      const response = await this.createSite(siteData);
      if (response.success) {
        console.log('🏗️ Default site created successfully:', response.site);
        return response.site;
      } else {
        console.error('🏗️ Failed to create default site:', response.error);
        return null;
      }
    } catch (error: any) {
      console.error('Error creating default site:', error);
      return null;
    }
  }
}

export const siteService = new SiteService();
export default siteService;
