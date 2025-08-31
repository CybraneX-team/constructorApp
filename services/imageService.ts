import API_CONFIG from '../config/api';

export interface ImageUploadResponse {
  success: boolean;
  message: string;
  image?: {
    id: string;
    fileName: string;
    jobNumber: string;
    uploadedAt: string;
  };
  error?: string;
}

export interface ImageData {
  id: string;
  fileName: string;
  originalName: string;
  presignedUrl: string;
  uploadedAt: string;
  fileSize: number;
  mimeType: string;
  customMetadata: any;
}

export const imageService = {
  // Upload a single image to AWS S3 via backend
  async uploadImage(
    imageUri: string,
    jobNumber: string,
    metadata?: any,
    token?: string
  ): Promise<ImageUploadResponse> {
    try {
      if (!token) {
        throw new Error('Authentication token required');
      }

      // Create FormData for multipart upload
      const formData = new FormData();
      
      // Detect file extension from URI
      const fileExtension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = fileExtension === 'png' ? 'image/png' : 
                      fileExtension === 'gif' ? 'image/gif' : 
                      fileExtension === 'webp' ? 'image/webp' : 'image/jpeg';
      
      // Add the image file
      formData.append('image', {
        uri: imageUri,
        type: mimeType,
        name: `image_${Date.now()}.${fileExtension}`
      } as any);
      
      // Add job number
      formData.append('jobNumber', jobNumber);
      
      // Add metadata if provided
      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }

      console.log('📸 Uploading image for job:', jobNumber);
      console.log('📸 Image URI:', imageUri);
      console.log('📸 Metadata:', metadata);
      console.log('📸 API Base URL:', API_CONFIG.BASE_URL);
      console.log('📸 Full URL:', `${API_CONFIG.BASE_URL}/images/upload`);

      const response = await fetch(`${API_CONFIG.BASE_URL}/images/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();
      
      console.log('📸 Response status:', response.status);
      console.log('📸 Response headers:', response.headers);
      console.log('📸 Response body:', result);
      
      if (!response.ok) {
        throw new Error(result.error || `Upload failed with status ${response.status}`);
      }

      console.log('📸 Image upload successful:', result);
      return result;
    } catch (error) {
      console.error('📸 Image upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  },

  // Get images for a specific job number
  async getImagesForJob(jobNumber: string, token?: string): Promise<ImageData[]> {
    try {
      if (!token) {
        throw new Error('Authentication token required');
      }

      console.log('📸 Fetching images for job:', jobNumber);

      const response = await fetch(`${API_CONFIG.BASE_URL}/recordings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `Failed to fetch images with status ${response.status}`);
      }

      // Find the day recording for this job number and extract images
      const dayRecording = result.dayRecordings?.find((rec: any) => rec.jobNumber === jobNumber);
      const images = dayRecording?.images || [];

      console.log('📸 Found images for job:', jobNumber, images.length);
      return images;
    } catch (error) {
      console.error('📸 Failed to fetch images:', error);
      return [];
    }
  },

  // Get images for a specific day recording
  async getImagesForDayRecording(dayRecordingId: string, token?: string): Promise<ImageData[]> {
    try {
      if (!token) {
        throw new Error('Authentication token required');
      }

      console.log('📸 Fetching images for day recording:', dayRecordingId);

      const response = await fetch(`${API_CONFIG.BASE_URL}/recordings/${dayRecordingId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `Failed to fetch day recording with status ${response.status}`);
      }

      const images = result.recording?.images || [];
      console.log('📸 Found images for day recording:', dayRecordingId, images.length);
      return images;
    } catch (error) {
      console.error('📸 Failed to fetch images for day recording:', error);
      return [];
    }
  }
};
