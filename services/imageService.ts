import API_CONFIG from '../config/api';

export interface ImageUploadResponse {
  success: boolean;
  message: string;
  image?: {
    id: string;
    url: string;
    s3_key: string;
    mime_type: string;
    file_size: number;
    uploaded_at: string;
    original_name: string;
  };
  error?: string;
}

export interface ImageData {
  id: string;
  url: string;
  s3_key: string;
  mime_type: string;
  file_size: number;
  uploaded_at: string;
  original_name: string;
}

export const imageService = {
  // Find the current day recording for a job number (today's recording)
  async getCurrentDayRecordingId(job_id: string, token?: string): Promise<string | null> {
    try {
      if (!token) {
        console.warn('📸 No token provided for getCurrentDayRecordingId');
        return null;
      }

      console.log('📸 Fetching current day recording for job_id:', job_id);

      const response = await fetch(`${API_CONFIG.BASE_URL}/recording/day-logs?job_id=${encodeURIComponent(job_id)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('📸 Failed to fetch day logs:', result.error);
        return null;
      }

      // Find today's recording for this job_id
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const dayLogs = result.day_logs || [];
      const todaysRecording = dayLogs.find((log: any) => {
        return log.local_date === todayStr;
      });

      if (todaysRecording?.id) {
        console.log('📸 Found current day recording ID:', todaysRecording.id);
        return todaysRecording.id;
      } else {
        console.log('📸 No current day recording found for job_id:', job_id);
        return null;
      }
    } catch (error) {
      console.error('📸 Failed to get current day recording ID:', error);
      return null;
    }
  },

  // Upload a single image to AWS S3 via backend
  async uploadImage(
    imageUri: string,
    job_id: string,
    metadata?: any,
    token?: string,
    day_id?: string
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
      
      // Add job_id (site ObjectId)
      formData.append('job_id', job_id);
      
      // Add day_id if provided
      if (day_id) {
        formData.append('day_id', day_id);
      }
      
      // Add metadata if provided
      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }

      console.log('📸 Uploading image for job_id:', job_id);
      console.log('📸 Day ID:', day_id);
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

      // Transform the backend response to match our expected format
      const transformedResult: ImageUploadResponse = {
        success: true,
        message: 'Image uploaded successfully',
        image: {
          id: result.id,
          url: '', // Will be provided when fetching from summary
          s3_key: '', // Will be provided when fetching from summary
          mime_type: '', // Will be provided when fetching from summary
          file_size: 0, // Will be provided when fetching from summary
          uploaded_at: new Date(result.uploaded_at).toISOString(),
          original_name: result.file_name
        }
      };

      console.log('📸 Image upload successful:', transformedResult);
      return transformedResult;
    } catch (error) {
      console.error('📸 Image upload failed:', error);
      return {
        success: false,
        message: 'Upload failed',
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  },

  // Get images for a specific job_id (images are now included in summary endpoint)
  async getImagesForJob(job_id: string, token?: string): Promise<ImageData[]> {
    try {
      if (!token) {
        throw new Error('Authentication token required');
      }

      console.log('📸 Fetching images for job_id:', job_id);

      // Get day logs for this job_id
      const dayLogsResponse = await fetch(`${API_CONFIG.BASE_URL}/recording/day-logs?job_id=${encodeURIComponent(job_id)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const dayLogsResult = await dayLogsResponse.json();
      
      if (!dayLogsResponse.ok) {
        throw new Error(dayLogsResult.error || `Failed to fetch day logs with status ${dayLogsResponse.status}`);
      }

      // Get images from all day logs for this job
      const allImages: ImageData[] = [];
      const dayLogs = dayLogsResult.day_logs || [];
      
      for (const dayLog of dayLogs) {
        try {
          const summaryResponse = await fetch(`${API_CONFIG.BASE_URL}/recording/day/${dayLog.id}/summary`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (summaryResponse.ok) {
            const summaryResult = await summaryResponse.json();
            const images = summaryResult.images || [];
            allImages.push(...images);
          }
        } catch (error) {
          console.warn('📸 Failed to fetch images for day log:', dayLog.id, error);
        }
      }

      console.log('📸 Found images for job_id:', job_id, allImages.length);
      return allImages;
    } catch (error) {
      console.error('📸 Failed to fetch images:', error);
      return [];
    }
  },

  // Get images for a specific day recording (now using summary endpoint)
  async getImagesForDayRecording(day_id: string, token?: string): Promise<ImageData[]> {
    try {
      if (!token) {
        throw new Error('Authentication token required');
      }

      console.log('📸 Fetching images for day recording:', day_id);

      const response = await fetch(`${API_CONFIG.BASE_URL}/recording/day/${day_id}/summary`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `Failed to fetch day recording summary with status ${response.status}`);
      }

      const images = result.images || [];
      console.log('📸 Found images for day recording:', day_id, images.length);
      return images;
    } catch (error) {
      console.error('📸 Failed to fetch images for day recording:', error);
      return [];
    }
  },

  // Delete an image using the new Rust backend
  async deleteImage(imageId: string, token?: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!token) {
        throw new Error('Authentication token required');
      }

      console.log('📸 Deleting image:', imageId);

      const response = await fetch(`${API_CONFIG.BASE_URL}/images/${imageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || `Failed to delete image with status ${response.status}`);
      }

      console.log('📸 Image deleted successfully:', imageId);
      return { success: true };
    } catch (error) {
      console.error('📸 Failed to delete image:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete image' 
      };
    }
  }
};
