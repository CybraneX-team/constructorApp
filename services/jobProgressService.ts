// Job Progress API Service
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
    // Use the same backend URL as recording service
    this.baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Progress fetch failed:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data: JobProgressResponse = await response.json();
      return this.processJobProgressData(data);
    } catch (error) {
      console.error('❌ Error fetching progress:', error);
      
      if (error instanceof TypeError && error.message === 'Network request failed') {
        console.error('🔍 Network debugging info:');
        console.error('   - Backend URL:', this.baseUrl);
        console.error('   - Full API URL:', apiUrl);
      }
      
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
