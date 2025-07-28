import { Audio } from 'expo-av';
import { config } from '../config/app.config';

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
    this.baseUrl = baseUrl || config.backend.baseUrl;
    console.log('🔧 RecordingService initialized with URL:', this.baseUrl);
    console.log('🔧 Config backend baseUrl:', config.backend.baseUrl);
    console.log('🔧 Environment variable EXPO_PUBLIC_BACKEND_URL:', process.env.EXPO_PUBLIC_BACKEND_URL);
  }

  /**
   * Uploads a recording to the backend
   * @param recording - The Audio.Recording object from expo-av
   * @param metadata - Additional metadata about the recording
   * @returns Promise<UploadResponse>
   */
  async uploadRecording(
    recording: Audio.Recording,
    metadata: {
      title: string;
      jobNumber: string;
      type: string;
      transcription?: string;
    }
  ): Promise<UploadResponse> {
    try {
      // Get recording status and URI
      const status = await recording.getStatusAsync();
      const uri = recording.getURI();

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
        duration: this.formatDuration(status.durationMillis || 0),
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
      const response = await this.performUpload(uploadData);
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
        // For now, we'll use default values based on expo-av settings
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
  private async performUpload(data: RecordingUploadData): Promise<UploadResponse> {
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

    const response = await fetch(`${this.baseUrl}/recordings/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
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
    recording: Audio.Recording,
    metadata: {
      title: string;
      jobNumber: string;
      type: string;
      transcription?: string;
    }
  ): Promise<UploadResponse> {
    try {
      console.log('🚀 Starting upload to:', this.baseUrl);
      
      const status = await recording.getStatusAsync();
      const uri = recording.getURI();

      if (!uri) {
        throw new Error('Recording URI is null');
      }

      console.log('📁 Recording URI:', uri);
      console.log('⏱️ Recording duration:', status.durationMillis);

      const audioInfo = await this.getAudioFileInfo(uri);
      const base64Audio = await this.prepareAudioData(uri);

      const uploadData: RecordingUploadData = {
        id: this.generateId(),
        title: metadata.title,
        duration: this.formatDuration(status.durationMillis || 0),
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

      const response = await fetch(`${this.baseUrl}/recordings/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
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
      
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      console.log('✅ Connection test response:', response.status);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
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
