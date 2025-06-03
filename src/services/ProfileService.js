/**
 * ProfileService - Free Tier Profile Management
 * Handles display names and profile pictures without Firebase Storage
 * Uses Gravatar, UI Avatars, and base64 storage within Firestore
 */

import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from '../config/firebase';
import CryptoJS from 'crypto-js';

class ProfileService {
  constructor() {
    this.maxImageSize = 100 * 1024; // 100KB limit for base64 storage
    this.compressionQuality = 0.8;
    this.avatarSize = 200; // Standard avatar size
  }

  /**
   * Generate MD5 hash for Gravatar
   */
  generateGravatarHash(email) {
    if (!email) return '';
    return CryptoJS.MD5(email.toLowerCase().trim()).toString();
  }

  /**
   * Get Gravatar URL with proper fallback
   */
  getGravatarUrl(email, size = this.avatarSize, fallback = 'identicon') {
    const hash = this.generateGravatarHash(email);
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=${fallback}`;
  }

  /**
   * Get UI Avatars URL (generated avatar with initials)
   */
  getUIAvatarUrl(name, size = this.avatarSize) {
    const initials = this.getInitials(name);
    const backgroundColor = this.generateColorFromName(name);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=${size}&background=${backgroundColor}&color=fff&bold=true`;
  }

  /**
   * Get user initials from display name
   */
  getInitials(name) {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  /**
   * Generate consistent color from name
   */
  generateColorFromName(name) {
    if (!name) return '6366f1';

    const colors = [
      '6366f1', // indigo
      '8b5cf6', // violet
      'a855f7', // purple
      'd946ef', // fuchsia
      'ec4899', // pink
      'f43f5e', // rose
      'ef4444', // red
      'f97316', // orange
      'f59e0b', // amber
      'eab308', // yellow
      '84cc16', // lime
      '22c55e', // green
      '10b981', // emerald
      '14b8a6', // teal
      '06b6d4', // cyan
      '0ea5e9', // sky
      '3b82f6', // blue
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Compress image to base64 within size limits
   */
  async compressImageToBase64(file) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Set canvas size to avatar dimensions
        canvas.width = this.avatarSize;
        canvas.height = this.avatarSize;

        // Draw and compress image
        ctx.drawImage(img, 0, 0, this.avatarSize, this.avatarSize);

        // Try different quality levels to stay under size limit
        let quality = this.compressionQuality;
        let base64;

        do {
          base64 = canvas.toDataURL('image/jpeg', quality);
          quality -= 0.1;
        } while (base64.length > this.maxImageSize && quality > 0.1);

        if (base64.length > this.maxImageSize) {
          reject(new Error(`Image too large. Maximum size is ${this.maxImageSize / 1024}KB after compression.`));
        } else {
          resolve(base64);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Check if Gravatar exists for email
   * Uses a more efficient approach that avoids 404 errors
   */
  async checkGravatarExists(email) {
    try {
      const hash = this.generateGravatarHash(email);
      // Use a default fallback and check if it's different from the default
      // This avoids 404 errors while still checking for custom avatars
      const checkUrl = `https://www.gravatar.com/avatar/${hash}?s=80&d=mp`;
      const response = await fetch(checkUrl, { method: 'HEAD' });

      // If we get a successful response, assume a custom avatar exists
      // This is more reliable than using d=404 which causes console errors
      return response.ok;
    } catch (error) {
      // Silently fail and assume no custom Gravatar exists
      return false;
    }
  }

  /**
   * Get profile picture URL with fallback chain
   * Always uses a valid fallback (never d=404) to prevent console errors
   */
  async getProfilePictureUrl(user) {
    const { email, displayName, profilePictureBase64 } = user;

    // 1. Custom uploaded image (base64)
    if (profilePictureBase64) {
      return profilePictureBase64;
    }

    // 2. Use Gravatar with identicon fallback (no existence check to avoid 404s)
    if (email) {
      // Always use Gravatar with identicon fallback - this will show either
      // the user's custom Gravatar or a nice geometric pattern, never 404
      return this.getGravatarUrl(email, this.avatarSize, 'identicon');
    }

    // 3. UI Avatars (generated with initials) - fallback for no email
    if (displayName) {
      return this.getUIAvatarUrl(displayName);
    }

    // 4. Default UI Avatar with generic initials
    return this.getUIAvatarUrl('User');
  }

  /**
   * Update user display name
   */
  async updateDisplayName(user, displayName) {
    try {
      console.log('Updating display name for user:', user.uid, 'to:', displayName);
      console.log('User object:', user);

      // Validate inputs
      if (!user || !user.uid) {
        throw new Error('Invalid user object - missing uid');
      }

      if (!displayName || displayName.trim().length === 0) {
        throw new Error('Display name cannot be empty');
      }

      // Update Firebase Auth profile first
      console.log('Updating Firebase Auth profile...');
      await updateProfile(user, { displayName: displayName.trim() });
      console.log('Firebase Auth profile updated successfully');

      // Update Firestore document
      console.log('Updating Firestore document...');
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        displayName: displayName.trim(),
        display_name: displayName.trim(), // Legacy compatibility
        updatedAt: new Date()
      });

      console.log('Display name updated successfully');
      return { success: true, message: 'Display name updated successfully' };
    } catch (error) {
      console.error('Failed to update display name:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      return { success: false, message: `Failed to update display name: ${error.message}` };
    }
  }

  /**
   * Upload and store profile picture as base64
   */
  async uploadProfilePicture(user, file) {
    try {
      console.log('Processing profile picture for user:', user.uid);
      console.log('User object:', user);
      console.log('File:', file.name, 'Size:', file.size, 'Type:', file.type);

      // Validate inputs
      if (!user || !user.uid) {
        throw new Error('Invalid user object - missing uid');
      }

      if (!file) {
        throw new Error('No file provided');
      }

      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select a valid image file');
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit before compression
        throw new Error('Image file is too large. Please select an image under 5MB.');
      }

      // Compress to base64
      console.log('Compressing image...');
      const base64Image = await this.compressImageToBase64(file);
      console.log('Image compressed to:', Math.round(base64Image.length / 1024), 'KB');

      // Update Firestore document
      console.log('Updating Firestore document...');
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        profilePictureBase64: base64Image,
        profilePictureUrl: base64Image, // Legacy compatibility
        updatedAt: new Date()
      });

      console.log('Profile picture updated successfully');
      return {
        success: true,
        url: base64Image,
        message: 'Profile picture updated successfully'
      };
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      return {
        success: false,
        message: error.message || 'Failed to upload profile picture'
      };
    }
  }

  /**
   * Remove profile picture (revert to Gravatar/generated)
   */
  async removeProfilePicture(user) {
    try {
      console.log('Removing profile picture for user:', user.uid);

      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        profilePictureBase64: null,
        profilePictureUrl: null, // Legacy compatibility
        updatedAt: new Date()
      });

      console.log('Profile picture removed successfully');
      return { success: true, message: 'Profile picture removed successfully' };
    } catch (error) {
      console.error('Failed to remove profile picture:', error);
      return { success: false, message: `Failed to remove profile picture: ${error.message}` };
    }
  }

  /**
   * Get complete user profile with computed avatar URL
   */
  async getUserProfile(userId) {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }

      const userData = userDoc.data();
      const profilePictureUrl = await this.getProfilePictureUrl(userData);

      return {
        ...userData,
        profilePictureUrl,
        initials: this.getInitials(userData.displayName || userData.email)
      };
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  }
}

export default new ProfileService();
