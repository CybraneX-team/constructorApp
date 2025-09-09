import axiosInstance from '../utils/axiosConfig';
import { Site } from '../contexts/SiteContext';

export interface CreateSiteData {
  name: string;
  site_id: string; // Rust backend uses snake_case
  company_name: string; // Rust backend uses snake_case
  stakeholders: string[];
  is_active?: boolean; // Rust backend uses snake_case
}

export interface UpdateSiteData {
  name?: string;
  site_id?: string; // Rust backend uses snake_case
  company_name?: string; // Rust backend uses snake_case
  stakeholders?: string[];
  is_active?: boolean; // Rust backend uses snake_case
}

export interface SitesResponse {
  sites: Site[]; // Rust backend returns sites directly
}

export interface SiteResponse extends Site {
  // Rust backend returns site fields directly
}

export interface CreateSiteResponse {
  id: string; // Rust backend returns only the id
}

export interface DeleteSiteResponse {
  // Rust backend returns empty response on successful delete
}

class SiteService {
  /**
   * Get all accessible sites
   */
  async getAllSites(): Promise<SitesResponse> {
    try {
      const response = await axiosInstance.get('/sites');
      return response.data; // Rust backend returns { sites: [...] }
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
      return response.data; // Rust backend returns site fields directly
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
      return response.data; // Rust backend returns { id: "..." }
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
      if (response.sites) {
        console.log('🔍 Available sites:', response.sites.map(site => ({
          id: site.id,
          name: site.name,
          site_id: site.site_id,
          company_name: site.company_name,
          stakeholders: site.stakeholders
        })));
        
        const matchingSite = response.sites.find(site => {
          // Try exact match first
          if (site.site_id === jobNumber) {
            console.log(`🔍 Exact match found with site_id: "${site.name}" (${site.site_id})`);
            return true;
          }
          
          // Try partial matches
          const nameMatch = site.name.toLowerCase().includes(jobNumber.toLowerCase());
          const companyMatch = site.company_name.toLowerCase().includes(jobNumber.toLowerCase());
          const siteIdPartial = site.site_id.toLowerCase().includes(jobNumber.toLowerCase());
          
          const matches = nameMatch || companyMatch || siteIdPartial;
          console.log(`🔍 Checking site "${site.name}" (${site.site_id}): name=${nameMatch}, company=${companyMatch}, site_id=${siteIdPartial} => ${matches ? 'MATCH' : 'no match'}`);
          return matches;
        });
        
        if (matchingSite) {
          console.log('🔍 Found matching site:', {
            id: matchingSite.id,
            name: matchingSite.name,
            site_id: matchingSite.site_id,
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
        site_id: site.site_id,
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
        site_id: jobNumber,
        company_name: 'Default Company',
        stakeholders: defaultStakeholders,
        is_active: true
      };

      const response = await this.createSite(siteData);
      if (response.id) {
        console.log('🏗️ Default site created successfully with ID:', response.id);
        // Fetch the created site to return the full object
        const createdSite = await this.getSiteById(response.id);
        return createdSite;
      } else {
        console.error('🏗️ Failed to create default site');
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
