/**
 * Image Upload Service
 *
 * Handles image upload, processing, and storage using Firebase Storage
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';
import imageCompression from 'browser-image-compression';

class ImageUploadService {
  constructor() {
    this.storage = storage;
    this.maxFileSize = 8 * 1024 * 1024; // 8MB in bytes
    this.allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    this.compressionOptions = {
      maxSizeMB: 8,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
      fileType: 'image/jpeg',
      quality: 0.8
    };
  }

  /**
   * Validate uploaded file
   */
  validateFile(file) {
    const errors = [];

    if (!file) {
      errors.push('No file selected');
      return { isValid: false, errors };
    }

    // Check file type
    if (!this.allowedTypes.includes(file.type)) {
      errors.push('Invalid file type. Please upload JPEG, PNG, WebP, or GIF images.');
    }

    // Check file size (before compression)
    if (file.size > 50 * 1024 * 1024) { // 50MB limit for original file
      errors.push('File is too large. Please select a file smaller than 50MB.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Compress and process image
   */
  async processImage(file, cropData = null) {
    try {
      let processedFile = file;

      // If crop data is provided, crop the image first
      if (cropData) {
        processedFile = await this.cropImage(file, cropData);
      }

      // Compress the image
      const compressedFile = await imageCompression(processedFile, this.compressionOptions);

      // Ensure the compressed file is under the size limit
      if (compressedFile.size > this.maxFileSize) {
        // Try with more aggressive compression
        const aggressiveOptions = {
          ...this.compressionOptions,
          maxSizeMB: 4,
          quality: 0.6
        };
        const recompressedFile = await imageCompression(processedFile, aggressiveOptions);

        if (recompressedFile.size > this.maxFileSize) {
          throw new Error('Unable to compress image to required size. Please try a smaller image.');
        }

        return recompressedFile;
      }

      return compressedFile;
    } catch (error) {
      console.error('Image processing error:', error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Crop image using canvas
   */
  async cropImage(file, cropData) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // Set canvas size to crop dimensions
          canvas.width = cropData.width;
          canvas.height = cropData.height;

          // Draw cropped image
          ctx.drawImage(
            img,
            cropData.x,
            cropData.y,
            cropData.width,
            cropData.height,
            0,
            0,
            cropData.width,
            cropData.height
          );

          // Convert canvas to blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Create a new File object with the original name
                const croppedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now()
                });
                resolve(croppedFile);
              } else {
                reject(new Error('Failed to crop image'));
              }
            },
            file.type,
            0.9
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for cropping'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Upload image to Firebase Storage
   */
  async uploadImage(file, userId, onProgress = null) {
    try {
      if (!userId) {
        throw new Error('User ID is required for upload');
      }

      console.log('Starting upload for user:', userId, 'File:', file.name, 'Size:', file.size);

      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `profile_${timestamp}.${fileExtension}`;
      const filePath = `users/${userId}/profile-pictures/${fileName}`;

      console.log('Upload path:', filePath);

      // Create storage reference
      const storageRef = ref(this.storage, filePath);

      // Set progress to 50% when starting upload
      if (onProgress) {
        onProgress(50);
      }

      // Upload file
      console.log('Uploading file to Firebase Storage...');
      const snapshot = await uploadBytes(storageRef, file);
      console.log('Upload completed, getting download URL...');

      // Set progress to 75% when upload completes
      if (onProgress) {
        onProgress(75);
      }

      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('Download URL obtained:', downloadURL);

      // Set progress to 100% when everything is done
      if (onProgress) {
        onProgress(100);
      }

      return {
        success: true,
        url: downloadURL,
        path: filePath,
        fileName: fileName
      };
    } catch (error) {
      console.error('Upload error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });

      // Provide more specific error messages
      if (error.code === 'storage/unauthorized') {
        throw new Error('You do not have permission to upload files. Please make sure you are signed in and try again.');
      } else if (error.code === 'storage/canceled') {
        throw new Error('Upload was canceled. Please try again.');
      } else if (error.code === 'storage/unknown') {
        throw new Error('An unknown storage error occurred. This might be a CORS issue. Please try again.');
      } else if (error.code === 'storage/quota-exceeded') {
        throw new Error('Storage quota exceeded. Please contact support.');
      } else if (error.code === 'storage/retry-limit-exceeded') {
        throw new Error('Upload failed after multiple retries. Please check your internet connection and try again.');
      } else if (error.message && error.message.includes('CORS')) {
        throw new Error('CORS error: The storage service is not properly configured. Please contact support.');
      } else if (error.message && error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Please check your internet connection and try again.');
      } else {
        throw new Error(`Upload failed: ${error.message || 'Unknown error occurred'}`);
      }
    }
  }

  /**
   * Delete image from Firebase Storage
   */
  async deleteImage(imagePath) {
    try {
      if (!imagePath) {
        return { success: true, message: 'No image to delete' };
      }

      const storageRef = ref(this.storage, imagePath);
      await deleteObject(storageRef);

      return {
        success: true,
        message: 'Image deleted successfully'
      };
    } catch (error) {
      console.error('Delete error:', error);
      // Don't throw error for delete failures - just log them
      return {
        success: false,
        message: `Failed to delete image: ${error.message}`
      };
    }
  }

  /**
   * Get image URL from storage path
   */
  async getImageUrl(imagePath) {
    try {
      if (!imagePath) {
        return null;
      }

      const storageRef = ref(this.storage, imagePath);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      console.error('Get image URL error:', error);
      return null;
    }
  }

  /**
   * Create preview URL for file
   */
  createPreviewUrl(file) {
    return URL.createObjectURL(file);
  }

  /**
   * Revoke preview URL to free memory
   */
  revokePreviewUrl(url) {
    URL.revokeObjectURL(url);
  }
}

export default new ImageUploadService();
