/**
 * Firebase Authentication Service
 *
 * Provides authentication methods using Firebase Auth
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  updatePassword,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import ProfileService from './ProfileService';

class FirebaseAuthService {
  constructor() {
    this.auth = auth;
    this.db = db;
  }

  /**
   * Register a new user with email and password
   */
  async register(email, password, displayName) {
    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // Update user profile with display name
      await updateProfile(user, {
        displayName: displayName
      });

      // Create user document in Firestore
      await setDoc(doc(this.db, 'users', user.uid), {
        email: user.email,
        displayName: displayName,
        display_name: displayName, // Keep both for compatibility
        profilePictureBase64: null, // New base64 storage field
        profilePictureUrl: null, // Legacy compatibility
        profilePicturePath: null, // Legacy compatibility
        avatar_url: null, // Legacy field for backward compatibility
        createdAt: new Date(),
        lastLogin: new Date(),
        emailVerified: user.emailVerified,
        preferences: {
          theme: 'dark',
          defaultBoss: 'ketuduke',
          notifications: true
        }
      });

      // Send email verification
      await sendEmailVerification(user);

      return {
        success: true,
        user: {
          id: user.uid,
          email: user.email,
          displayName: displayName,
          emailVerified: user.emailVerified
        },
        message: 'Account created successfully. Please check your email for verification.'
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Sign in with email and password
   */
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // Update last login time
      await updateDoc(doc(this.db, 'users', user.uid), {
        lastLogin: new Date()
      });

      return {
        success: true,
        user: {
          id: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified
        },
        message: 'Logged in successfully'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Sign out current user
   */
  async logout() {
    try {
      await signOut(this.auth);
      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(this.auth, email);
      return {
        success: true,
        message: 'Password reset email sent'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Update user password
   */
  async changePassword(newPassword) {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      await updatePassword(user, newPassword);
      return {
        success: true,
        message: 'Password updated successfully'
      };
    } catch (error) {
      console.error('Password change error:', error);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Update user display name using ProfileService
   */
  async updateDisplayName(displayName) {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      return await ProfileService.updateDisplayName(user, displayName);
    } catch (error) {
      console.error('Display name update error:', error);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Update user profile (legacy method for backward compatibility)
   */
  async updateProfile(profileData) {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      // If it's just a display name update, use ProfileService
      if (profileData.displayName || profileData.display_name) {
        const displayName = profileData.displayName || profileData.display_name;
        return await ProfileService.updateDisplayName(user, displayName);
      }

      // For other profile updates, handle directly
      console.log('Updating profile for user:', user.uid);
      console.log('Profile data:', profileData);

      // Prepare data for Firestore
      const firestoreData = {
        ...profileData,
        updatedAt: new Date()
      };

      console.log('Updating Firestore document with data:', firestoreData);

      // Update Firestore user document
      await updateDoc(doc(this.db, 'users', user.uid), firestoreData);
      console.log('Firestore document updated successfully');

      return {
        success: true,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      console.error('Profile update error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Update user profile picture using ProfileService
   */
  async updateProfilePicture(imageFile) {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      return await ProfileService.uploadProfilePicture(user, imageFile);
    } catch (error) {
      console.error('Profile picture update error:', error);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Remove user profile picture using ProfileService
   */
  async removeProfilePicture() {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      return await ProfileService.removeProfilePicture(user);
    } catch (error) {
      console.error('Profile picture removal error:', error);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Get user profile from Firestore with computed avatar URL
   */
  async getUserProfile(userId = null) {
    try {
      const uid = userId || this.auth.currentUser?.uid;
      if (!uid) {
        throw new Error('No user ID provided');
      }

      const profile = await ProfileService.getUserProfile(uid);

      return {
        success: true,
        user: {
          id: uid,
          ...profile
        }
      };
    } catch (error) {
      console.error('Get user profile error:', error);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Create user profile in Firestore (for missing profiles)
   */
  async createUserProfile(userId, userData) {
    try {
      const userDocRef = doc(this.db, 'users', userId);

      // Check if document already exists
      const existingDoc = await getDoc(userDocRef);
      if (existingDoc.exists()) {
        console.log('User profile already exists');
        return {
          success: true,
          message: 'User profile already exists'
        };
      }

      // Create new user document
      await setDoc(userDocRef, {
        email: userData.email,
        displayName: userData.displayName || userData.email?.split('@')[0] || 'User',
        display_name: userData.displayName || userData.email?.split('@')[0] || 'User', // Keep both for compatibility
        profilePictureBase64: null, // New base64 storage field
        profilePictureUrl: null, // Legacy compatibility
        profilePicturePath: null, // Legacy compatibility
        avatar_url: null, // Legacy field for backward compatibility
        createdAt: new Date(),
        lastLogin: new Date(),
        emailVerified: userData.emailVerified || false,
        preferences: {
          theme: 'dark',
          defaultBoss: 'ketuduke',
          notifications: true
        }
      });

      console.log('User profile created successfully for:', userId);
      return {
        success: true,
        message: 'User profile created successfully'
      };
    } catch (error) {
      console.error('Create user profile error:', error);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(this.auth, provider);
      const user = userCredential.user;

      // Check if user document exists, create if not
      const userDoc = await getDoc(doc(this.db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(this.db, 'users', user.uid), {
          email: user.email,
          displayName: user.displayName,
          display_name: user.displayName, // Keep both for compatibility
          profilePictureBase64: null, // New base64 storage field
          profilePictureUrl: user.photoURL, // Legacy compatibility - Google photo URL
          profilePicturePath: null, // Legacy compatibility
          avatar_url: user.photoURL, // Legacy field for backward compatibility
          createdAt: new Date(),
          lastLogin: new Date(),
          emailVerified: user.emailVerified,
          preferences: {
            theme: 'dark',
            defaultBoss: 'ketuduke',
            notifications: true
          }
        });
      } else {
        // Update last login
        await updateDoc(doc(this.db, 'users', user.uid), {
          lastLogin: new Date()
        });
      }

      return {
        success: true,
        user: {
          id: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified
        },
        message: 'Logged in with Google successfully'
      };
    } catch (error) {
      console.error('Google sign-in error:', error);
      return {
        success: false,
        message: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Listen to authentication state changes
   */
  onAuthStateChanged(callback) {
    return onAuthStateChanged(this.auth, callback);
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.auth.currentUser;
  }

  /**
   * Convert Firebase error codes to user-friendly messages
   */
  getErrorMessage(error) {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found with this email address';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection';
      default:
        return error.message || 'An unexpected error occurred';
    }
  }
}

export default new FirebaseAuthService();
