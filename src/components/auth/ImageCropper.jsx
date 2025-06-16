/**
 * Image Cropper Component
 * 
 * Interactive image cropping interface with zoom and pan controls
 */

import React, { useState, useRef, useCallback } from 'react';
import ReactCrop from 'react-image-crop';
import styled from 'styled-components';
import 'react-image-crop/dist/ReactCrop.css';

// Styled Components
const CropperContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  background: ${props => props.theme.colors.background};
  border-radius: 12px;
  border: 1px solid ${props => props.theme.colors.border};
`;

const CropperHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  gap: 16px;
`;

const CropperTitle = styled.h3`
  margin: 0;
  color: ${props => props.theme.colors.text};
  font-size: 18px;
  font-weight: 600;
`;

const ImageContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  background: ${props => props.theme.colors.surface};
  border-radius: 8px;
  border: 2px dashed ${props => props.theme.colors.border};
  position: relative;
  overflow: hidden;

  .ReactCrop {
    max-width: 100%;
    max-height: 400px;
  }

  .ReactCrop__image {
    max-width: 100%;
    max-height: 400px;
    object-fit: contain;
  }
`;

const ControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ZoomControls = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ZoomLabel = styled.label`
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  font-weight: 500;
  min-width: 60px;
`;

const ZoomSlider = styled.input`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: ${props => props.theme.colors.border};
  outline: none;
  
  &::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${props => props.theme.colors.primary};
    cursor: pointer;
  }
  
  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${props => props.theme.colors.primary};
    cursor: pointer;
    border: none;
  }
`;

const ZoomValue = styled.span`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 14px;
  min-width: 40px;
  text-align: right;
`;

const PresetButtons = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const PresetButton = styled.button`
  padding: 8px 16px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  background: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.surface};
  color: ${props => props.$active ? props.theme.colors.white : props.theme.colors.text};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$active ? props.theme.colors.primaryHover : props.theme.colors.surfaceHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
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

const ImageCropper = ({ 
  imageFile, 
  onCropComplete, 
  onCancel,
  initialCrop = null 
}) => {
  const [crop, setCrop] = useState(initialCrop || {
    unit: '%',
    width: 80,
    height: 80,
    x: 10,
    y: 10,
    aspect: 1 // Square aspect ratio for profile pictures
  });
  const [zoom, setZoom] = useState(1);
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);

  // Handle crop change
  const onCropChange = useCallback((newCrop) => {
    setCrop(newCrop);
  }, []);

  // Handle crop complete
  const onCropCompleteHandler = useCallback((newCrop) => {
    setCompletedCrop(newCrop);
  }, []);

  // Apply preset crop sizes
  const applyPreset = (preset) => {
    const presets = {
      small: { width: 60, height: 60, x: 20, y: 20 },
      medium: { width: 80, height: 80, x: 10, y: 10 },
      large: { width: 90, height: 90, x: 5, y: 5 }
    };

    if (presets[preset]) {
      setCrop({
        ...crop,
        ...presets[preset]
      });
    }
  };

  // Handle zoom change
  const handleZoomChange = (e) => {
    setZoom(parseFloat(e.target.value));
  };

  // Handle crop confirmation
  const handleCropConfirm = async () => {
    if (!completedCrop || !imgRef.current) {
      return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], imageFile.name, {
          type: imageFile.type,
          lastModified: Date.now()
        });
        onCropComplete(croppedFile, {
          x: completedCrop.x * scaleX,
          y: completedCrop.y * scaleY,
          width: completedCrop.width * scaleX,
          height: completedCrop.height * scaleY
        });
      }
    }, imageFile.type, 0.9);
  };

  return (
    <CropperContainer>
      <CropperHeader>
        <CropperTitle>Crop Your Profile Picture</CropperTitle>
      </CropperHeader>

      <ImageContainer>
        <ReactCrop
          crop={crop}
          onChange={onCropChange}
          onComplete={onCropCompleteHandler}
          aspect={1}
          minWidth={50}
          minHeight={50}
          keepSelection
        >
          <img
            ref={imgRef}
            src={URL.createObjectURL(imageFile)}
            alt="Crop preview"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center'
            }}
          />
        </ReactCrop>
      </ImageContainer>

      <ControlsContainer>
        <ZoomControls>
          <ZoomLabel>Zoom:</ZoomLabel>
          <ZoomSlider
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={zoom}
            onChange={handleZoomChange}
          />
          <ZoomValue>{Math.round(zoom * 100)}%</ZoomValue>
        </ZoomControls>

        <div>
          <ZoomLabel style={{ marginBottom: '8px', display: 'block' }}>
            Preset Sizes:
          </ZoomLabel>
          <PresetButtons>
            <PresetButton onClick={() => applyPreset('small')}>
              Small
            </PresetButton>
            <PresetButton onClick={() => applyPreset('medium')}>
              Medium
            </PresetButton>
            <PresetButton onClick={() => applyPreset('large')}>
              Large
            </PresetButton>
          </PresetButtons>
        </div>
      </ControlsContainer>

      <ButtonGroup>
        <ActionButton onClick={onCancel}>
          Cancel
        </ActionButton>
        <ActionButton 
          variant="primary" 
          onClick={handleCropConfirm}
          disabled={!completedCrop}
        >
          Apply Crop
        </ActionButton>
      </ButtonGroup>
    </CropperContainer>
  );
};

export default ImageCropper;
