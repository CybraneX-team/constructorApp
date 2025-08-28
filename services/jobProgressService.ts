// Job Progress API Service
export interface JobProgressResponse {
  success: boolean;
  jobNumber: string;
  progress: {
    completionPercentage: number;
    tasksCompleted: number;
    tasksLeft: number;
    totalTasks: number;
  };
  taskDetails: {
    [key: string]: boolean; // true = completed, false = not completed
  };
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
  };
}

class JobProgressService {
  private baseUrl: string;
  
  constructor() {
    // Use the same backend URL as recording service
    this.baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
    console.log('🔧 JobProgressService initialized with URL:', this.baseUrl);
  }

  async getJobProgress(jobNumber: string): Promise<ProcessedJobProgress> {
    const apiUrl = `${this.baseUrl}/progress?jobNumber=${encodeURIComponent(jobNumber)}`;
    console.log('🔍 Fetching job progress for:', jobNumber, 'from URL:', apiUrl);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers if needed
          // 'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📱 Response status:', response.status);
      console.log('📱 Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Job progress fetch failed:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data: JobProgressResponse = await response.json();
      console.log('✅ Job progress data received:', data);
      
      if (!data.success) {
        console.error('❌ API returned unsuccessful response:', data);
        throw new Error('API returned unsuccessful response');
      }

      const processedData = this.processJobProgressData(data);
      console.log('✅ Job progress processed:', processedData);
      return processedData;
    } catch (error) {
      console.error('❌ Error fetching job progress:', error);
      
      // Enhanced error logging
      if (error instanceof TypeError && error.message === 'Network request failed') {
        console.error('🔍 Network debugging info:');
        console.error('   - Backend URL:', this.baseUrl);
        console.error('   - Full API URL:', apiUrl);
        console.error('   - Check if backend is running and accessible');
        console.error('   - Verify network connectivity');
        console.error('   - For Android: ensure android:usesCleartextTraffic="true" in manifest');
        console.error('   - For iOS: check App Transport Security settings');
      }
      
      console.log('ℹ️ Falling back to default progress data');
      // Return default/empty data in case of error to show the modal is working
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
    
    // The API returns a different structure than expected
    // API response: { progress: { completionPercentage, tasksCompleted, tasksLeft, totalTasks }, taskDetails: {...} }
    
    // Create tasks based on taskDetails
    const allTasks: JobTask[] = [];
    const remainingTasks: JobTask[] = [];
    
    if (data.taskDetails) {
      Object.entries(data.taskDetails).forEach(([category, isCompleted]) => {
        const task: JobTask = {
          category: this.formatCategoryName(category),
          task: `${this.formatCategoryName(category)} tasks`,
          status: isCompleted ? 'completed' as const : 'not_started' as const,
          completionPercentage: isCompleted ? 100 : 0,
          evidence: [],
        };
        
        allTasks.push(task);
        if (!isCompleted) {
          remainingTasks.push(task);
        }
      });
    }

    return {
      overallProgress: data.progress?.completionPercentage || 0,
      tasksCompleted: data.progress?.tasksCompleted || 0,
      totalTasks: data.progress?.totalTasks || 0,
      inProgressTasks: 0, // API doesn't provide in-progress count
      remainingTasks,
      allTasks,
      lastUpdated: new Date().toISOString(),
      categories: data.taskDetails || {},
    };
  }

  private formatCategoryName(category: string): string {
    return category
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace('Labour', 'Labor');
  }

  private getDefaultJobProgress(): ProcessedJobProgress {
    // Fallback data in case API fails
    return {
      overallProgress: 50,
      tasksCompleted: 5,
      totalTasks: 10,
      inProgressTasks: 3,
      remainingTasks: [
        {
          category: 'Construction',
          task: 'Complete foundation inspection',
          status: 'not_started',
          completionPercentage: 0,
          evidence: [],
        },
        {
          category: 'Construction', 
          task: 'Install electrical wiring',
          status: 'in_progress',
          completionPercentage: 25,
          evidence: [],
        },
        {
          category: 'Construction',
          task: 'Finish drywall installation',
          status: 'not_started',
          completionPercentage: 0,
          evidence: [],
        },
        {
          category: 'Quality Control',
          task: 'Paint interior walls',
          status: 'not_started',
          completionPercentage: 0,
          evidence: [],
        },
      ],
      allTasks: [],
      lastUpdated: new Date().toISOString(),
      categories: {},
    };
  }

  // Method to get mock data for development/testing
  getMockJobProgress(): ProcessedJobProgress {
    const mockData: JobProgressResponse = {
      "success": true,
      "jobNumber": "JOB-4432",
      "overallProgress": 67,
      "lastUpdated": "2025-08-26T15:30:00.000Z",
      "summary": {
        "totalTasks": 14,
        "completedTasks": 9,
        "inProgressTasks": 3,
        "notStartedTasks": 2
      },
      "categories": {
        "Management": {
          "totalTasks": 1,
          "completedTasks": 1,
          "progressPercentage": 100
        },
        "Labor": {
          "totalTasks": 3,
          "completedTasks": 2,
          "progressPercentage": 67
        },
        "Materials": {
          "totalTasks": 2,
          "completedTasks": 2,
          "progressPercentage": 100
        },
        "Equipment": {
          "totalTasks": 3,
          "completedTasks": 2,
          "progressPercentage": 67
        },
        "Construction": {
          "totalTasks": 3,
          "completedTasks": 1,
          "progressPercentage": 33
        },
        "Quality Control": {
          "totalTasks": 1,
          "completedTasks": 0,
          "progressPercentage": 0
        },
        "Logistics": {
          "totalTasks": 1,
          "completedTasks": 1,
          "progressPercentage": 100
        }
      },
      "tasks": {
        "completed": [
          {
            "category": "Management",
            "task": "Project Management",
            "status": "completed",
            "completionPercentage": 100,
            "evidence": ["manager: 45.5 hours"]
          },
          {
            "category": "Materials",
            "task": "Concrete Delivery",
            "status": "completed",
            "completionPercentage": 100,
            "evidence": ["Argos Class 4: 150.5 CY"]
          }
        ],
        "inProgress": [
          {
            "category": "Construction",
            "task": "Concrete Pouring",
            "status": "in_progress",
            "completionPercentage": 75,
            "evidence": [
              "[2025-08-26]: Poured 25 cubic yards of concrete for retaining wall"
            ]
          },
          {
            "category": "Equipment",
            "task": "Excavator Operations",
            "status": "in_progress",
            "completionPercentage": 60,
            "evidence": [
              "[2025-08-26]: Completed 60% of excavation work"
            ]
          },
          {
            "category": "Labor",
            "task": "Site Preparation",
            "status": "in_progress",
            "completionPercentage": 80,
            "evidence": [
              "[2025-08-26]: Site clearing nearly complete"
            ]
          }
        ],
        "notStarted": [
          {
            "category": "Quality Control",
            "task": "Survey and Layout",
            "status": "not_started",
            "completionPercentage": 0,
            "evidence": []
          },
          {
            "category": "Construction",
            "task": "Electrical Installation",
            "status": "not_started",
            "completionPercentage": 0,
            "evidence": []
          }
        ]
      }
    };

    return this.processJobProgressData(mockData);
  }
}

export const jobProgressService = new JobProgressService();
