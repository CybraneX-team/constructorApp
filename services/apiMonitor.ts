/**
 * API Monitoring Service
 * Tracks API performance and provides insights into slow requests
 */

interface ApiCall {
  url: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
}

class ApiMonitorService {
  private calls: ApiCall[] = [];
  private readonly MAX_CALLS = 50; // Keep last 50 calls for analysis

  /**
   * Start monitoring an API call
   */
  startCall(url: string, method: string = 'GET'): string {
    const callId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.calls.push({
      url,
      method,
      startTime: Date.now(),
      success: false,
    });

    // Keep only recent calls
    if (this.calls.length > this.MAX_CALLS) {
      this.calls = this.calls.slice(-this.MAX_CALLS);
    }

    console.log(`[${new Date().toISOString()}] 🚀 API_START - ${method} ${url}`);
    return callId;
  }

  /**
   * End monitoring an API call
   */
  endCall(url: string, method: string, success: boolean, error?: string): void {
    const call = this.calls.find(c => 
      c.url === url && 
      c.method === method && 
      !c.endTime
    );

    if (call) {
      call.endTime = Date.now();
      call.duration = call.endTime - call.startTime;
      call.success = success;
      call.error = error;

      const status = success ? '✅' : '❌';
      const duration = call.duration;
      
      if (duration > 10000) {
        console.warn(`[${new Date().toISOString()}] 🐌 SLOW_API - ${method} ${url} took ${duration}ms - Performance issue detected!`);
      } else if (duration > 5000) {
        console.log(`[${new Date().toISOString()}] ⚠️ API_SLOW - ${method} ${url} took ${duration}ms`);
      } else {
        console.log(`[${new Date().toISOString()}] ${status} API_END - ${method} ${url} - ${duration}ms`);
      }
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    totalCalls: number;
    averageDuration: number;
    slowCalls: ApiCall[];
    failedCalls: ApiCall[];
    successRate: number;
  } {
    const completedCalls = this.calls.filter(c => c.endTime);
    const totalDuration = completedCalls.reduce((sum, call) => sum + (call.duration || 0), 0);
    const slowCalls = completedCalls.filter(c => (c.duration || 0) > 5000);
    const failedCalls = completedCalls.filter(c => !c.success);
    const successfulCalls = completedCalls.filter(c => c.success);

    return {
      totalCalls: completedCalls.length,
      averageDuration: completedCalls.length > 0 ? Math.round(totalDuration / completedCalls.length) : 0,
      slowCalls,
      failedCalls,
      successRate: completedCalls.length > 0 ? Math.round((successfulCalls.length / completedCalls.length) * 100) : 0,
    };
  }

  /**
   * Log current performance statistics
   */
  logStats(): void {
    const stats = this.getStats();
    
    console.log(`[${new Date().toISOString()}] 📊 API_STATS - Total: ${stats.totalCalls}, Avg: ${stats.averageDuration}ms, Success: ${stats.successRate}%`);
    
    if (stats.slowCalls.length > 0) {
      console.warn(`[${new Date().toISOString()}] 🐌 SLOW_CALLS - ${stats.slowCalls.length} slow calls detected:`);
      stats.slowCalls.forEach(call => {
        console.warn(`  - ${call.method} ${call.url}: ${call.duration}ms`);
      });
    }
    
    if (stats.failedCalls.length > 0) {
      console.error(`[${new Date().toISOString()}] ❌ FAILED_CALLS - ${stats.failedCalls.length} failed calls:`);
      stats.failedCalls.forEach(call => {
        console.error(`  - ${call.method} ${call.url}: ${call.error}`);
      });
    }
  }

  /**
   * Check if backend is responding slowly
   */
  isBackendSlow(): boolean {
    const stats = this.getStats();
    return stats.averageDuration > 5000 || stats.slowCalls.length > 2;
  }

  /**
   * Clear all monitoring data
   */
  clear(): void {
    this.calls = [];
  }
}

// Export singleton instance
export const apiMonitor = new ApiMonitorService();
export default ApiMonitorService;
