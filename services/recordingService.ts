import { AudioRecorder } from 'expo-audio';
import { config } from '../config/app.config';
import { apiMonitor } from './apiMonitor';

export interface RecordingUploadData {
  id: string;
  title: string;
  duration: string;
  date: string;
  jobNumber: string;
  type: string;
  audioFile: string; // base64 encoded audio or file URI
  transcription?: string;
  metadata: {
    sampleRate?: number;
    channels?: number;
    bitRate?: number;
    fileSize?: number;
    mimeType?: string;
  };
}

export interface UploadResponse {
  success: boolean;
  recordingId?: string;
  message?: string;
  error?: string;
}

class RecordingService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? String(config.backend.baseUrl || '');
    console.log('🔧 RecordingService initialized with URL:', this.baseUrl);
    console.log('🔧 Config backend baseUrl:', config.backend.baseUrl);
    console.log('🔧 Environment variable EXPO_PUBLIC_BACKEND_URL:', process.env.EXPO_PUBLIC_BACKEND_URL);
  }

  /**
   * Uploads a recording to the backend
   * @param recording - The AudioRecorder object from expo-audio
   * @param metadata - Additional metadata about the recording
   * @returns Promise<UploadResponse>
   */
  async uploadRecording(
    recording: AudioRecorder,
    metadata: {
      title: string;
      jobNumber: string;
      type: string;
      transcription?: string;
    },
    token?: string
  ): Promise<UploadResponse> {
    try {
      // Get recording status and URI  
      const status = recording.getStatus();
      const uri = recording.uri;
      const duration = status.durationMillis;

      if (!uri) {
        throw new Error('Recording URI is null');
      }

      // Get audio file info
      const audioInfo = await this.getAudioFileInfo(uri);
      
      // Convert audio file to base64 or prepare for FormData
      const audioData = await this.prepareAudioData(uri);

      // Prepare upload data
      const uploadData: RecordingUploadData = {
        id: this.generateId(),
        title: metadata.title,
        duration: this.formatDuration(duration || 0),
        date: new Date().toISOString(),
        jobNumber: metadata.jobNumber,
        type: metadata.type,
        audioFile: audioData,
        transcription: metadata.transcription,
        metadata: {
          sampleRate: audioInfo.sampleRate,
          channels: audioInfo.channels,
          bitRate: audioInfo.bitRate,
          fileSize: audioInfo.fileSize,
          mimeType: audioInfo.mimeType,
        },
      };

      // Upload to backend
      const response = await this.performUpload(uploadData, token);
      return response;

    } catch (error) {
      console.error('Upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error',
      };
    }
  }

  /**
   * Prepares audio data for upload (converts to base64 or FormData)
   */
  private async prepareAudioData(uri: string): Promise<string> {
    try {
      // For React Native, we'll read the file and convert to base64
      const response = await fetch(uri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          // Remove data:audio/m4a;base64, prefix if present
          const base64Data = base64.split(',')[1] || base64;
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error preparing audio data:', error);
      throw error;
    }
  }

  /**
   * Gets audio file information
   */
  private async getAudioFileInfo(uri: string): Promise<{
    sampleRate?: number;
    channels?: number;
    bitRate?: number;
    fileSize?: number;
    mimeType?: string;
  }> {
    try {
      const response = await fetch(uri, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      const contentType = response.headers.get('content-type');

      return {
        fileSize: contentLength ? parseInt(contentLength, 10) : undefined,
        mimeType: contentType || 'audio/m4a',
        // Note: Detailed audio metadata (sample rate, channels, bitrate) 
        // would require additional audio processing libraries
        // For now, we'll use default values based on expo-audio settings
        sampleRate: 44100,
        channels: 2,
        bitRate: 128000,
      };
    } catch (error) {
      console.error('Error getting audio file info:', error);
      return {
        mimeType: 'audio/m4a',
        sampleRate: 44100,
        channels: 2,
        bitRate: 128000,
      };
    }
  }

  /**
   * Performs the actual HTTP upload to the backend
   */
  private async performUpload(data: RecordingUploadData, token?: string): Promise<UploadResponse> {
    const formData = new FormData();
    
    // Append all the data fields
    formData.append('id', data.id);
    formData.append('title', data.title);
    formData.append('duration', data.duration);
    formData.append('date', data.date);
    formData.append('jobNumber', data.jobNumber);
    formData.append('type', data.type);
    formData.append('metadata', JSON.stringify(data.metadata));
    
    if (data.transcription) {
      formData.append('transcription', data.transcription);
    }

    // For the audio file, we can either send as base64 in JSON or as a file in FormData
    // Option 1: As base64 in the request body (JSON)
    // Option 2: As a file in FormData (more efficient for large files)
    
    // We'll use FormData approach for better handling of large audio files
    formData.append('audioFile', {
      uri: data.audioFile, // This would be the file URI, not base64
      type: data.metadata.mimeType || 'audio/m4a',
      name: `recording_${data.id}.m4a`,
    } as any);

    const headers: Record<string, string> = {
      'Content-Type': 'multipart/form-data',
    };
    
    // Add authorization header if token is provided
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}/recordings/save`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return {
      success: true,
      recordingId: result.id || data.id,
      message: result.message || 'Recording uploaded successfully',
    };
  }

  /**
   * Alternative upload method using JSON payload with base64 audio
   */
  async uploadRecordingAsJSON(
    recording: AudioRecorder,
    metadata: {
      title: string;
      jobNumber: string;
      type: string;
      transcription?: string;
      durationOverrideMs?: number;
    },
    token?: string
  ): Promise<UploadResponse> {
    try {
      console.log('🚀 Starting upload to:', this.baseUrl);
      
      const status = recording.getStatus();
      const uri = recording.uri;
      const duration = metadata.durationOverrideMs ?? status.durationMillis;

      if (!uri) {
        throw new Error('Recording URI is null');
      }

      console.log('📁 Recording URI:', uri);
      console.log('⏱️ Recording duration:', duration);

      const audioInfo = await this.getAudioFileInfo(uri);
      const base64Audio = await this.prepareAudioData(uri);

      const uploadData: RecordingUploadData = {
        id: this.generateId(),
        title: metadata.title,
        duration: this.formatDuration(duration || 0),
        date: new Date().toISOString(),
        jobNumber: metadata.jobNumber,
        type: metadata.type,
        audioFile: base64Audio,
        transcription: metadata.transcription,
        metadata: audioInfo,
      };

      console.log('📤 Upload data prepared:', {
        id: uploadData.id,
        title: uploadData.title,
        duration: uploadData.duration,
        audioFileSize: base64Audio.length,
        url: `${this.baseUrl}/recordings/save`
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('🔑 Including authorization token in request');
      } else {
        console.warn('⚠️ No authentication token provided for upload');
      }

      const response = await fetch(`${this.baseUrl}/recordings/save`, {
        method: 'POST',
        headers,
        body: JSON.stringify(uploadData),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload failed response:', errorText);
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Upload successful:', result);
      
      return {
        success: true,
        recordingId: result.id || uploadData.id,
        message: result.message || 'Recording uploaded successfully',
      };

    } catch (error) {
      console.error('❌ JSON Upload failed:', error);
      
      if (error instanceof TypeError && error.message === 'Network request failed') {
        console.error('🔍 Network debugging info:');
        console.error('   - Backend URL:', this.baseUrl);
        console.error('   - Check if backend is running');
        console.error('   - Check if device can reach backend IP');
        console.error('   - For Android: ensure android:usesCleartextTraffic="true" in manifest');
        console.error('   - For iOS: check App Transport Security settings');
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error',
      };
    }
  }

  /**
   * Generates a unique ID for the recording
   */
  private generateId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Formats duration from milliseconds to MM:SS format
   */
  private formatDuration(durationMs: number): string {
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Test connectivity to the backend
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔍 Testing connection to:', this.baseUrl);
      
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      console.log('✅ Connection test response:', response.status);
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Health check result:', result);
        return { success: true };
      } else {
        throw new Error(`Health check failed with status: ${response.status}`);
      }
      
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  /**
   * Search recordings using backend AI search
   * @param query - The search query from user
   * @param token - JWT authentication token
   * @returns Promise with search results
   */
  async searchRecordings(query: string, token: string): Promise<{
    success: boolean;
    message?: string;
    recordings: any[];
    count: number;
    error?: string;
  }> {
    try {
      console.log('🔍 Searching recordings with query:', query);
      console.log('🔑 Using token:', token ? 'Token provided' : 'No token');
      console.log('🌐 Backend URL:', this.baseUrl);
      
      const searchUrl = `${this.baseUrl}/search`;
      console.log('📡 Search URL:', searchUrl);
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };
      console.log('📋 Request headers:', headers);
      
      const response = await fetch(searchUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
      });

      console.log('📡 Search response status:', response.status);
      console.log('📡 Search response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Search failed response:', errorText);
        throw new Error(`Search failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Search successful:', result);
      
      return {
        success: result.success,
        message: result.message,
        recordings: result.recordings || [],
        count: result.count || 0,
      };

    } catch (error) {
      console.error('❌ Search request failed:', error);
      
      // Enhanced error logging
      if (error instanceof TypeError && error.message === 'Network request failed') {
        console.error('🔍 Network debugging info:');
        console.error('   - Backend URL:', this.baseUrl);
        console.error('   - Full search URL:', `${this.baseUrl}/search`);
        console.error('   - Check if backend is running and accessible');
        console.error('   - Verify network connectivity');
        console.error('   - For Android: ensure android:usesCleartextTraffic="true" in manifest');
        console.error('   - For iOS: check App Transport Security settings');
      }
      
      return {
        success: false,
        recordings: [],
        count: 0,
        error: error instanceof Error ? error.message : 'Search request failed',
      };
    }
  }

  /**
   * Get all recordings for the authenticated user
   * @param token - JWT authentication token
   * @returns Promise with all recordings
   */
  async getAllRecordings(token: string): Promise<{
    success: boolean;
    recordings: any[];
    dayRecordings: any[];
    count: number;
    error?: string;
  }> {
    const apiUrl = `${this.baseUrl}/recordings`;
    
    try {
      // Start API monitoring
      apiMonitor.startCall(apiUrl, 'GET');
      console.log('📂 Fetching all recordings');
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch recordings:', errorText);
        throw new Error(`Failed to fetch recordings: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Recordings fetched successfully:', result.count, 'recordings');
      console.log('📂 API response structure:', Object.keys(result));
      
      // End API monitoring - success
      apiMonitor.endCall(apiUrl, 'GET', true);
      
      return {
        success: result.success,
        recordings: result.recordings || [],
        dayRecordings: result.dayRecordings || [],
        count: result.count || 0,
      };

    } catch (error) {
      console.error('❌ Failed to fetch recordings:', error);
      
      // End API monitoring - error
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch recordings';
      apiMonitor.endCall(apiUrl, 'GET', false, errorMessage);
      
      // Handle timeout specifically
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          recordings: [],
          dayRecordings: [],
          count: 0,
          error: 'Request timed out after 30 seconds. Please check your network connection.',
        };
      }
      
      return {
        success: false,
        recordings: [],
        dayRecordings: [],
        count: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Upload recording using URI (for expo-audio)
   */
  async uploadRecordingWithUri(
    recordingUri: string,
    metadata: {
      title: string;
      jobNumber: string;
      type: string;
      transcription?: string;
    },
    token?: string
  ): Promise<UploadResponse> {
    try {
      console.log('🚀 Starting upload to:', this.baseUrl);
      console.log('📁 Recording URI:', recordingUri);

      const audioInfo = await this.getAudioFileInfo(recordingUri);
      const base64Audio = await this.prepareAudioData(recordingUri);

      const uploadData: RecordingUploadData = {
        id: this.generateId(),
        title: metadata.title,
        duration: '00:00', // We'll update this with actual duration if available
        date: new Date().toISOString(),
        jobNumber: metadata.jobNumber,
        type: metadata.type,
        audioFile: base64Audio,
        transcription: metadata.transcription,
        metadata: audioInfo,
      };

      console.log('📤 Upload data prepared:', {
        id: uploadData.id,
        title: uploadData.title,
        duration: uploadData.duration,
        audioFileSize: base64Audio.length,
        url: `${this.baseUrl}/recordings/save`
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      
      // Add authorization header if token is provided
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('🔑 Including authorization token in request');
      } else {
        console.warn('⚠️ No authentication token provided for upload');
      }

      const response = await fetch(`${this.baseUrl}/recordings/save`, {
        method: 'POST',
        headers,
        body: JSON.stringify(uploadData),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload failed response:', errorText);
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Upload successful:', result);
      
      return {
        success: true,
        recordingId: result.id || uploadData.id,
        message: result.message || 'Recording uploaded successfully',
      };

    } catch (error) {
      console.error('❌ URI Upload failed:', error);
      
      // More detailed error logging
      if (error instanceof TypeError && error.message === 'Network request failed') {
        console.error('🔍 Network debugging info:');
        console.error('   - Backend URL:', this.baseUrl);
        console.error('   - Check if backend is running');
        console.error('   - Check if device can reach backend IP');
        console.error('   - For Android: ensure android:usesCleartextTraffic="true" in manifest');
        console.error('   - For iOS: check App Transport Security settings');
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error',
      };
    }
  }

  async getRecordingSummary(id: string, token: string): Promise<{
    success: boolean;
    summary: any;
    error?: string;
  }> {
    try {
      // The backend endpoint is GET, not POST, and doesn't require email in body
      const url = `${this.baseUrl}/recordings/${encodeURIComponent(id)}/summary`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Summary fetch failed: ${response.status} ${text}`);
      }

      const data = await response.json();
      return { success: true, summary: data };
    } catch (error: any) {
      console.error('Failed to fetch recording summary:', error);
      return { success: false, summary: null, error: error?.message || 'Unknown error' };
    }
  }

  /**
   * Delete a day recording
   * @param dayRecordingId - The day recording ID (format: YYYY-MM-DD_jobNumber)
   * @param token - JWT authentication token
   * @returns Promise with delete result
   */
  async deleteRecording(dayRecordingId: string, token: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    const apiUrl = `${this.baseUrl}/recordings/${encodeURIComponent(dayRecordingId)}`;
    
    try {
      apiMonitor.startCall(apiUrl, 'DELETE');
      console.log(`[${new Date().toISOString()}] 🗑️ DELETE_START - ${dayRecordingId}`);
      
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Delete failed response:', errorText);
        apiMonitor.endCall(apiUrl, 'DELETE', false, `${response.status} ${errorText}`);
        throw new Error(`Delete failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log(`[${new Date().toISOString()}] ✅ DELETE_SUCCESS - ${dayRecordingId}`);
      
      apiMonitor.endCall(apiUrl, 'DELETE', true);
      
      return {
        success: true,
        message: result.message || 'Recording deleted successfully',
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete recording';
      console.log(`[${new Date().toISOString()}] ❌ DELETE_ERROR - ${dayRecordingId} - ${errorMessage}`);
      
      apiMonitor.endCall(apiUrl, 'DELETE', false, errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update a recording field by updating the entire structured summary
   * @param recordingId - The recording ID
   * @param fieldPath - The path to the field (e.g., 'laborData.manager', 'dailyActivities')
   * @param value - The new value for the field
   * @param currentSummary - The current structured summary to update
   * @param token - JWT authentication token
   * @returns Promise with update result
   */
  async updateRecordingField(recordingId: string, fieldPath: string, value: any, token: string, currentSummary: any = {}): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    const apiUrl = `${this.baseUrl}/recordings/${encodeURIComponent(recordingId)}/summary`;
    
    try {
      apiMonitor.startCall(apiUrl, 'PUT');
      console.log(`[${new Date().toISOString()}] 📝 UPDATE_START - ${recordingId} - ${fieldPath}`);
      
      // Helper function to set a nested field value using dot notation
      function setNestedValue(obj: any, path: string, value: any) {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
          const key = keys[i];
          if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
            current[key] = {};
          }
          current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
      }
      
      // Create updated summary with the new field value
      const updatedSummary = JSON.parse(JSON.stringify(currentSummary)); // Deep copy
      setNestedValue(updatedSummary, fieldPath, value);
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          structuredSummary: updatedSummary,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Update failed response:', errorText);
        apiMonitor.endCall(apiUrl, 'PUT', false, `${response.status} ${errorText}`);
        throw new Error(`Update failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log(`[${new Date().toISOString()}] ✅ UPDATE_SUCCESS - ${recordingId} - ${fieldPath}`);
      
      apiMonitor.endCall(apiUrl, 'PUT', true);
      
      return {
        success: true,
        message: result.message || 'Field updated successfully',
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update field';
      console.log(`[${new Date().toISOString()}] ❌ UPDATE_ERROR - ${recordingId} - ${fieldPath} - ${errorMessage}`);
      
      apiMonitor.endCall(apiUrl, 'PUT', false, errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Delete an image using the backend DELETE /images/:id endpoint
   * @param imageId - The image ID to delete
   * @param token - JWT authentication token
   * @returns Promise with delete result
   */
  async deleteRecordingImage(imageId: string, token: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    const apiUrl = `${this.baseUrl}/images/${encodeURIComponent(imageId)}`;
    
    try {
      apiMonitor.startCall(apiUrl, 'DELETE');
      console.log(`[${new Date().toISOString()}] 🗑️ DELETE_IMAGE_START - ${imageId}`);
      
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Delete image failed response:', errorText);
        apiMonitor.endCall(apiUrl, 'DELETE', false, `${response.status} ${errorText}`);
        throw new Error(`Delete image failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log(`[${new Date().toISOString()}] ✅ DELETE_IMAGE_SUCCESS - ${imageId}`);
      
      apiMonitor.endCall(apiUrl, 'DELETE', true);
      
      return {
        success: true,
        message: result.message || 'Image deleted successfully',
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete image';
      console.log(`[${new Date().toISOString()}] ❌ DELETE_IMAGE_ERROR - ${imageId} - ${errorMessage}`);
      
      apiMonitor.endCall(apiUrl, 'DELETE', false, errorMessage);
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Sets the base URL for the backend
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }
}

// Export a singleton instance
export const recordingService = new RecordingService();
export default RecordingService;
