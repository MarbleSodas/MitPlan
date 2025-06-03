/**
 * Profile Picture Upload Component
 *
 * Handles file upload with drag-and-drop, validation, and cropping
 */

import React, { useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { Upload, Camera, X, AlertCircle, Check } from 'lucide-react';
import ImageCropper from './ImageCropper';
import ProfileService from '../../services/ProfileService';
import { useAuth } from '../../contexts/AuthContext';

// Styled Components
const UploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const UploadArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  border: 2px dashed ${props => props.isDragOver ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: 12px;
  background: ${props => props.isDragOver ? props.theme.colors.primaryLight : props.theme.colors.surface};
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 120px;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    background: ${props => props.theme.colors.primaryLight};
  }
`;

const UploadIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.white};
  margin-bottom: 12px;
`;

const UploadText = styled.div`
  text-align: center;
  color: ${props => props.theme.colors.text};
`;

const UploadTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
`;

const UploadSubtitle = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
`;

const HiddenInput = styled.input`
  display: none;
`;

const PreviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const PreviewImage = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${props => props.theme.colors.surface};
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.border};
`;

const PreviewThumbnail = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid ${props => props.theme.colors.border};
`;

const PreviewInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const PreviewName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.theme.colors.text};
`;

const PreviewSize = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
`;

const RemoveButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: ${props => props.theme.colors.danger};
  color: ${props => props.theme.colors.white};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.dangerHover};
  }
`;

const ErrorMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: ${props => props.theme.colors.dangerLight};
  color: ${props => props.theme.colors.danger};
  border-radius: 8px;
  font-size: 14px;
`;

const SuccessMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: ${props => props.theme.colors.successLight};
  color: ${props => props.theme.colors.success};
  border-radius: 8px;
  font-size: 14px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const ActionButton = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  ${props => props.variant === 'primary' ? `
    background: ${props.theme.colors.primary};
    color: ${props.theme.colors.white};

    &:hover {
      background: ${props.theme.colors.primaryHover};
    }
  ` : `
    background: ${props.theme.colors.surface};
    color: ${props.theme.colors.text};
    border: 1px solid ${props.theme.colors.border};

    &:hover {
      background: ${props.theme.colors.surfaceHover};
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const ProfilePictureUpload = ({
  currentImageUrl,
  onUploadComplete,
  onUploadError,
  userId,
  isLoading = false
}) => {
  // TEMPORARILY DISABLED: Profile picture upload functionality
  // This component is disabled to simplify profile management to display name only
  // All upload-related state and functionality is commented out for future re-enabling

  const { user: authUser } = useAuth(); // Get authenticated user from context

  // Commented out upload-related state
  // const [selectedFile, setSelectedFile] = useState(null);
  // const [previewUrl, setPreviewUrl] = useState(null);
  // const [isDragOver, setIsDragOver] = useState(false);
  // const [showCropper, setShowCropper] = useState(false);
  // const [errors, setErrors] = useState([]);
  // const [isUploading, setIsUploading] = useState(false);
  // const [uploadProgress, setUploadProgress] = useState(0);
  // const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileSelect = useCallback((file) => {
    setErrors([]);

    // Validate file
    if (!file.type.startsWith('image/')) {
      setErrors(['Please select a valid image file']);
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setErrors(['Image file is too large. Please select an image under 5MB.']);
      return;
    }

    // Set selected file and preview
    setSelectedFile(file);
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setShowCropper(true);
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleInputChange = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Handle crop complete
  const handleCropComplete = async (croppedFile, cropData) => {
    setShowCropper(false);
    setIsUploading(true);
    setUploadProgress(50); // Show initial progress
    setErrors([]); // Clear any previous errors

    try {
      // Use authenticated user from context, fallback to userId prop
      const currentUser = authUser || (userId ? { uid: userId } : null);

      if (!currentUser || !currentUser.uid) {
        throw new Error('User authentication required. Please sign in and try again.');
      }

      console.log('Starting profile picture upload process...');
      console.log('Authenticated user:', currentUser);
      console.log('Cropped file:', croppedFile.name, 'Size:', croppedFile.size);

      setUploadProgress(75); // Show progress

      // Upload using ProfileService (stores as base64 in Firestore)
      const result = await ProfileService.uploadProfilePicture(currentUser, croppedFile);

      if (result.success) {
        console.log('Upload successful!', result);
        setUploadProgress(100);
        onUploadComplete(result.url, null); // No path needed for base64
        setSelectedFile(null);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Profile picture upload error:', error);
      const errorMessage = error.message || 'Failed to upload profile picture';
      setErrors([errorMessage]);
      onUploadError(errorMessage);

      // Reset the UI state on error
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle crop cancel
  const handleCropCancel = () => {
    setShowCropper(false);
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  // Handle remove file
  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (showCropper && selectedFile) {
    return (
      <ImageCropper
        imageFile={selectedFile}
        onCropComplete={handleCropComplete}
        onCancel={handleCropCancel}
      />
    );
  }

  // TEMPORARILY DISABLED: Return simple disabled message
  return (
    <UploadContainer>
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#666',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
          Profile Picture Upload Temporarily Disabled
        </div>
        <div style={{ fontSize: '12px' }}>
          You can still use Gravatar or generated avatars with your initials
        </div>
      </div>
    </UploadContainer>
  );

  /* COMMENTED OUT FOR FUTURE RE-ENABLING:
  return (
    <UploadContainer>
      {!selectedFile && (
        <UploadArea
          isDragOver={isDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadIcon>
            <Camera size={24} />
          </UploadIcon>
          <UploadText>
            <UploadTitle>Upload Profile Picture</UploadTitle>
            <UploadSubtitle>
              Drag and drop an image here, or click to select
            </UploadSubtitle>
          </UploadText>
        </UploadArea>
      )}

      {selectedFile && previewUrl && (
        <PreviewContainer>
          <PreviewImage>
            <PreviewThumbnail src={previewUrl} alt="Preview" />
            <PreviewInfo>
              <PreviewName>{selectedFile.name}</PreviewName>
              <PreviewSize>{formatFileSize(selectedFile.size)}</PreviewSize>
            </PreviewInfo>
            <RemoveButton onClick={handleRemoveFile}>
              <X size={16} />
            </RemoveButton>
          </PreviewImage>
        </PreviewContainer>
      )}

      {errors.length > 0 && (
        <ErrorMessage>
          <AlertCircle size={16} />
          <div>
            {errors.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </div>
        </ErrorMessage>
      )}

      {isUploading && (
        <SuccessMessage>
          <LoadingSpinner />
          <div>Uploading... {uploadProgress}%</div>
        </SuccessMessage>
      )}

      <HiddenInput
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleInputChange}
      />
    </UploadContainer>
  );
  */
};

export default ProfilePictureUpload;
