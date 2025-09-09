// Job Progress API Service
import API_CONFIG from '../config/api';

export interface JobProgressResponse {
  success: boolean;
  jobNumber?: string;
  progress?: {
    completionPercentage: number;
    tasksCompleted?: number;
    tasksLeft?: number;
    totalTasks?: number;
  };
  taskDetails?: {
    [key: string]: boolean; // true = completed, false = not completed
  };
  // New backend flexible fields
  completion_percentage?: number;
  completionPercentage?: number;
  task_flags?: { [key: string]: boolean };
  tasks?: { [key: string]: boolean };
}

export interface JobTask {
  category: string;
  task: string;
  status: 'completed' | 'in_progress' | 'not_started';
  completionPercentage: number;
  evidence: string[];
}

export interface ProcessedJobProgress {
  overallProgress: number;
  tasksCompleted: number;
  totalTasks: number;
  inProgressTasks: number;
  remainingTasks: JobTask[];
  allTasks: JobTask[];
  lastUpdated: string;
  categories: {
    [key: string]: {
      totalTasks: number;
      completedTasks: number;
      progressPercentage: number;
    };
  } | { [key: string]: boolean };
}

class JobProgressService {
  private baseUrl: string;
  
  constructor() {
    // Use the same backend URL as the rest of the app
    this.baseUrl = API_CONFIG.BASE_URL;
    console.log('🔧 JobProgressService initialized with URL:', this.baseUrl);
  }

  // siteId is optional; when provided, the backend filters to that site
  async getJobProgress(siteId?: string, token?: string): Promise<ProcessedJobProgress> {
    const query = siteId ? `?site=${encodeURIComponent(siteId)}` : '';
    const apiUrl = `${this.baseUrl}/progress${query}`;
    console.log('🔍 Fetching progress for site:', siteId || '(all)', 'from URL:', apiUrl);
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('🔑 Including authorization token in progress request');
      } else {
        console.warn('⚠️ No authentication token provided for progress request');
      }

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers,
      });

      console.log('📱 Response status:', response.status);
      console.log('📱 Response headers:', response.headers);

      if (response.status === 404) {
        console.warn('ℹ️ Progress endpoint returned 404. Falling back to compute from day logs.');
        const fallback = await this.computeProgressFromDayLogs(siteId, token);
        if (fallback) return fallback;
        // If fallback fails, return empty
        return {
          overallProgress: 0,
          tasksCompleted: 0,
          totalTasks: 0,
          inProgressTasks: 0,
          remainingTasks: [],
          allTasks: [],
          lastUpdated: new Date().toISOString(),
          categories: {},
        };
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Progress fetch failed:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data: JobProgressResponse = await response.json();
      return this.processJobProgressData(data);
    } catch (error) {
      console.error('❌ Error fetching progress:', error);
      
      console.log('ℹ️ Falling back to default progress data');
      return {
        overallProgress: 0,
        tasksCompleted: 0,
        totalTasks: 0,
        inProgressTasks: 0,
        remainingTasks: [],
        allTasks: [],
        lastUpdated: new Date().toISOString(),
        categories: {},
      };
    }
  }

  private processJobProgressData(data: JobProgressResponse): ProcessedJobProgress {
    console.log('🔍 Processing job progress data:', data);
    
    // Normalize fields from both old and new backends
    const completion = data.progress?.completionPercentage
      ?? data.completion_percentage
      ?? data.completionPercentage
      ?? 0;

    const flags = data.taskDetails
      ?? data.task_flags
      ?? data.tasks
      ?? {};

    // Build task arrays from flags
    const allTasks: JobTask[] = [];
    const remainingTasks: JobTask[] = [];
    Object.entries(flags).forEach(([category, isCompleted]) => {
      const normalizedName = this.formatCategoryName(category);
        const task: JobTask = {
        category: normalizedName,
        task: `${normalizedName} tasks`,
        status: isCompleted ? 'completed' : 'not_started',
          completionPercentage: isCompleted ? 100 : 0,
          evidence: [],
        };
        allTasks.push(task);
      if (!isCompleted) remainingTasks.push(task);
      });

    // Derive counts from flags
    const totalTasks = Object.keys(flags).length || (data.progress?.totalTasks ?? 0);
    const tasksCompleted = Object.values(flags).filter(Boolean).length || (data.progress?.tasksCompleted ?? 0);

    return {
      overallProgress: completion,
      tasksCompleted,
      totalTasks,
      inProgressTasks: 0,
      remainingTasks,
      allTasks,
      lastUpdated: new Date().toISOString(),
      categories: flags,
    };
  }

  private async computeProgressFromDayLogs(siteId?: string, token?: string): Promise<ProcessedJobProgress | null> {
    try {
      if (!siteId) return null;
      // Fetch day logs for the site
      const logsRes = await fetch(`${this.baseUrl}/recording/day-logs?job_id=${encodeURIComponent(siteId)}`, {
        method: 'GET',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!logsRes.ok) return null;
      const logsJson = await logsRes.json();
      const dayLogs: any[] = logsJson.day_logs || [];
      if (!dayLogs.length) return null;
      // Pick the most recent by updated_at
      const latest = dayLogs.sort((a,b) => (b.updated_at||0) - (a.updated_at||0))[0];
      // Fetch summary for that day
      const sumRes = await fetch(`${this.baseUrl}/recording/day/${encodeURIComponent(latest.id)}/summary`, {
        method: 'GET',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!sumRes.ok) return null;
      const sumJson = await sumRes.json();
      const s = sumJson.summary || {};

      // Compute task flags
      const dailyActivities = !!(s.dailyActivities?.trim?.() || s.activities?.text || s.overview);

      const hasLabor = (() => {
        const ld = s.laborData || s.labor || s.labor_data || {};
        return Object.values(ld).some((row: any) => {
          if (!row) return false;
          const hours = Number((row.hours || '').toString().replace(/[^0-9.]/g, ''));
          return !!hours;
        });
      })();

      const hasSubcontractors = (() => {
        const sc = s.subcontractors || s.subcontractor || {};
        return Object.values(sc).some((row: any) => {
          if (!row) return false;
          const employees = Number(row.employees || 0);
          const hours = Number(row.hours || 0);
          return employees > 0 || hours > 0;
        });
      })();

      const hasMaterials = (() => {
        const md = s.materialsDeliveries || s.materials || {};
        return Object.values(md).some((row: any) => {
          if (!row) return false;
          const qty = Number((row.qty || '').toString().replace(/[^0-9.]/g, ''));
          return qty > 0;
        });
      })();

      const hasEquipment = (() => {
        const eq = s.equipment || {};
        return Object.values(eq).some((row: any) => {
          if (!row) return false;
          const days = Number(row.days || 0);
          return days > 0;
        });
      })();

      const flags: { [k: string]: boolean } = {
        dailyActivities,
        labour: hasLabor,
        subcontractors: hasSubcontractors,
        materialsDeliveries: hasMaterials,
        equipment: hasEquipment,
      };

      const totalTasks = Object.keys(flags).length;
      const tasksCompleted = Object.values(flags).filter(Boolean).length;
      const completionPercentage = Math.round((tasksCompleted / totalTasks) * 100);

      // Build tasks arrays
      const allTasks = Object.entries(flags).map(([category, done]) => ({
        category: this.formatCategoryName(category),
        task: `${this.formatCategoryName(category)} tasks`,
        status: done ? 'completed' as const : 'not_started' as const,
        completionPercentage: done ? 100 : 0,
        evidence: [],
      }));
      const remainingTasks = allTasks.filter(t => t.status !== 'completed');

      return {
        overallProgress: completionPercentage,
        tasksCompleted,
        totalTasks,
        inProgressTasks: 0,
        remainingTasks,
        allTasks,
        lastUpdated: new Date().toISOString(),
        categories: flags,
      };
    } catch (e) {
      console.log('⚠️ Fallback progress computation failed:', e);
      return null;
    }
  }

  private formatCategoryName(category: string): string {
    return category
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace('Labour', 'Labor')
      .replace('Materialsdeliveries', 'Materials Deliveries');
  }

  // Method to get mock data for development/testing
  getMockJobProgress(): ProcessedJobProgress {
    return {
      overallProgress: 50,
      tasksCompleted: 3,
      totalTasks: 5,
      inProgressTasks: 0,
      remainingTasks: [],
      allTasks: [],
      lastUpdated: new Date().toISOString(),
      categories: {
        dailyActivities: false,
        labour: true,
        subcontractors: true,
        materialsDeliveries: false,
        equipment: false,
      },
    };
  }
}

export const jobProgressService = new JobProgressService();
