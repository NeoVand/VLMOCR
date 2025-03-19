import { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Typography, Button, Tooltip, Chip, Zoom, Fade } from '@mui/material';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import SaveIcon from '@mui/icons-material/Save';
import CropIcon from '@mui/icons-material/Crop';
import StopIcon from '@mui/icons-material/Stop';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import 'react-image-crop/dist/ReactCrop.css';

// Color palette for regions (much more transparent)
const regionColors = [
  'rgba(245, 158, 11, 0.25)', // amber
  'rgba(14, 165, 233, 0.25)',  // sky blue
  'rgba(34, 197, 94, 0.25)',   // green
  'rgba(168, 85, 247, 0.25)',  // purple
  'rgba(239, 68, 68, 0.25)',   // red
  'rgba(251, 146, 60, 0.25)',  // orange
];

// Color palette for borders (still visible but more transparent)
const regionBorderColors = [
  'rgba(245, 158, 11, 0.5)', // amber
  'rgba(14, 165, 233, 0.5)',  // sky blue
  'rgba(34, 197, 94, 0.5)',   // green
  'rgba(168, 85, 247, 0.5)',  // purple
  'rgba(239, 68, 68, 0.5)',   // red
  'rgba(251, 146, 60, 0.5)',  // orange
];

interface Region {
  id: string;
  crop: PixelCrop;
  imageData: string;
}

interface ImageProcessorProps {
  image: File | null;
  onCropComplete: (croppedImage: string | null) => void;
  onGenerate?: () => void;
  onMultipleRegions?: (regions: Region[]) => void;
  onStop?: () => void;
  isGenerating: boolean;
}

const ImageProcessor = ({ 
  image, 
  onCropComplete, 
  onGenerate, 
  onMultipleRegions,
  onStop,
  isGenerating
}: ImageProcessorProps) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const cropComponentRef = useRef<HTMLDivElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [showSelectionGuide, setShowSelectionGuide] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hasSeenGuide, setHasSeenGuide] = useState(false);
  
  // Get the next region color index and color
  const getNextColorIndex = () => {
    return regions.length % regionColors.length;
  };

  const getNextColor = () => {
    const colorIndex = getNextColorIndex();
    return {
      bg: regionColors[colorIndex],
      border: regionBorderColors[colorIndex]
    };
  };

  // Set custom crop color based on the next region color
  useEffect(() => {
    // Apply the custom color to the crop selection
    const nextColorIndex = getNextColorIndex();
    const selectionColor = regionColors[nextColorIndex];
    const borderColor = regionBorderColors[nextColorIndex];
    
    document.documentElement.style.setProperty('--next-region-color', selectionColor);
    document.documentElement.style.setProperty('--next-region-border', borderColor);
  }, [regions.length, imgSrc]);

  // Load image when file changes
  useEffect(() => {
    if (image) {
      const reader = new FileReader();
      reader.onload = () => {
        setImgSrc(reader.result as string);
        setCrop(undefined); // Reset crop
        setCompletedCrop(null);
        setRegions([]); // Reset regions
        
        // Only show guide for first image or if user hasn't seen it yet
        if (!hasSeenGuide) {
          setShowSelectionGuide(true);
          setHasSeenGuide(true);
        } else {
          setShowSelectionGuide(false);
        }
        
        setHasInteracted(false);
      };
      reader.readAsDataURL(image);
    } else {
      setImgSrc(null);
    }
  }, [image, hasSeenGuide]);

  // Hide the selection guide after user interaction
  useEffect(() => {
    if (crop || regions.length > 0) {
      setHasInteracted(true);
    }
    
    if (hasInteracted && showSelectionGuide) {
      const timer = setTimeout(() => {
        setShowSelectionGuide(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [crop, regions, hasInteracted, showSelectionGuide]);

  // This function is triggered when the image is loaded
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    imgRef.current = img;
    setCrop(undefined);
  }, []);

  // Get current scale factors based on displayed image size vs natural size
  const getScaleFactors = useCallback(() => {
    if (!imgRef.current) return { scaleX: 1, scaleY: 1 };
    
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
    
    return { scaleX, scaleY };
  }, []);

  // Generate a cropped image
  const generateCroppedImage = useCallback((crop: PixelCrop | null) => {
    if (!imgRef.current) {
      return imgSrc;
    }
    
    if (!crop) {
      return imgSrc;
    }
    
    const image = imgRef.current;
    const { scaleX, scaleY } = getScaleFactors();
    
    const canvas = document.createElement('canvas');
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width,
        crop.height
      );
      
      return canvas.toDataURL('image/jpeg');
    }
    
    return imgSrc;
  }, [imgSrc, getScaleFactors]);

  // Add current crop as a region
  const saveRegion = () => {
    if (completedCrop && imgRef.current) {
      // Generate the cropped image data
      const croppedImage = generateCroppedImage(completedCrop);
      
      // Create a new region
      const regionId = `region-${Date.now()}`;
      const newRegion: Region = {
        id: regionId,
        crop: { ...completedCrop },
        imageData: croppedImage || ''
      };
      
      // Add to regions list
      const updatedRegions = [...regions, newRegion];
      setRegions(updatedRegions);
      
      // Notify parent about regions update
      if (onMultipleRegions) {
        onMultipleRegions(updatedRegions);
      }
      
      // Use full image or the last selected region for single region operations
      onCropComplete(croppedImage);
      
      // Reset crop for next selection
      setCrop(undefined);
      setCompletedCrop(null);
    }
  };

  // Reset all regions
  const resetAllRegions = () => {
    setRegions([]);
    setCrop(undefined);
    setCompletedCrop(null);
    onCropComplete(null);
    if (onMultipleRegions) {
      onMultipleRegions([]);
    }
  };

  // Generate
  const handleGenerate = () => {
    // If no regions are selected, use the full image
    if (regions.length === 0 && imgSrc) {
      // No crop, use full image
      onCropComplete(imgSrc);
    }
    
    // Call parent generate handler
    if (onGenerate) {
      onGenerate();
    }
  };

  // Stop generation
  const handleStop = () => {
    if (onStop) {
      onStop();
    }
  };

  // Delete a region
  const deleteRegion = (regionId: string) => {
    const updatedRegions = regions.filter(region => region.id !== regionId);
    setRegions(updatedRegions);
    
    if (onMultipleRegions) {
      onMultipleRegions(updatedRegions);
    }
    
    // If all regions are gone, reset completedCrop
    if (updatedRegions.length === 0) {
      setCompletedCrop(null);
      onCropComplete(null);
    } else {
      // Use the last region as the current crop
      const lastRegion = updatedRegions[updatedRegions.length - 1];
      setCompletedCrop(lastRegion.crop);
      onCropComplete(lastRegion.imageData);
    }
  };

  // Render selection guide overlay
  const renderSelectionGuide = () => {
    if (!imgRef.current || !showSelectionGuide || crop || !imgSrc) return null;
    
    return (
      <Fade in={true} timeout={800}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              maxWidth: '80%',
            }}
          >
            <CropIcon style={{ fontSize: 32, opacity: 0.9, color: '#f59e0b' }} />
            <Typography variant="subtitle2" sx={{ textAlign: 'center', color: '#fff', fontWeight: 500 }}>
              Click and drag to select a region of the image
            </Typography>
            <div 
              style={{
                width: '120px',
                height: '80px',
                border: '2px dashed #f59e0b',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '8px',
                animation: 'pulse 2s infinite',
              }}
            />
          </div>
        </div>
      </Fade>
    );
  };

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
    }}>
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        justifyContent: 'center', 
        alignItems: 'center', 
        mb: 2,
        gap: 2,
      }}>
        <Tooltip 
          title={!completedCrop ? "First select a region by clicking and dragging on the image" : "Save the selected region"}
          arrow
          placement="top"
        >
          <span>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<SaveIcon />}
              onClick={saveRegion}
              disabled={!completedCrop || isGenerating}
              sx={{
                minWidth: '120px',
                backgroundColor: !completedCrop ? 'transparent' : 'rgba(245, 158, 11, 0.08)',
                borderColor: !completedCrop ? undefined : getNextColor().border,
                color: !completedCrop ? undefined : 'rgba(0, 0, 0, 0.87)',
                fontWeight: !completedCrop ? undefined : 500,
              }}
            >
              Save Region
            </Button>
          </span>
        </Tooltip>
        
        <Tooltip title="Clear all selected regions" arrow placement="top">
          <span>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<ClearAllIcon />}
              onClick={resetAllRegions}
              disabled={regions.length === 0 || isGenerating}
              sx={{
                minWidth: '120px',
                backgroundColor: regions.length === 0 ? 'transparent' : 'rgba(239, 68, 68, 0.08)',
              }}
            >
              Clear Regions
            </Button>
          </span>
        </Tooltip>
        
        {!isGenerating ? (
          <Tooltip title="Generate text from selected regions or entire image" arrow placement="top">
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<AutorenewIcon />}
              onClick={handleGenerate}
              disabled={!imgSrc || isGenerating}
              sx={{
                minWidth: '120px',
                backgroundImage: 'linear-gradient(to right, #f59e0b, #d97706)',
              }}
            >
              Generate
            </Button>
          </Tooltip>
        ) : (
          <Tooltip title="Stop text generation" arrow placement="top">
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<StopIcon />}
              onClick={handleStop}
              sx={{
                minWidth: '120px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
              }}
            >
              Stop
            </Button>
          </Tooltip>
        )}
      </Box>
      
      {regions.length > 0 && (
        <Zoom in={regions.length > 0} timeout={300}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
              {regions.length} {regions.length === 1 ? 'Region' : 'Regions'} Selected
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {regions.map((region, index) => {
                const colorIndex = index % regionColors.length;
                return (
                  <Zoom in={true} key={region.id} timeout={200}>
                    <Chip
                      label={`Region ${index + 1}`}
                      size="small"
                      onDelete={() => deleteRegion(region.id)}
                      sx={{
                        backgroundColor: regionColors[colorIndex],
                        color: 'rgba(0, 0, 0, 0.87)',
                        fontWeight: 500,
                        boxShadow: 'none',
                      }}
                    />
                  </Zoom>
                );
              })}
            </Box>
          </Box>
        </Zoom>
      )}
      
      <Box 
        sx={{ 
          position: 'relative',
          flex: 1, 
          overflow: 'auto',
          border: imgSrc ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
          borderRadius: 1,
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}
      >
        <div ref={cropComponentRef} className="crop-wrapper">
          {imgSrc ? (
            <>
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => {
                  setCrop(percentCrop);
                  setShowSelectionGuide(false);
                }}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={undefined}
                className="custom-crop-component"
              >
                <img
                  ref={imgRef}
                  alt="Upload"
                  src={imgSrc}
                  style={{ 
                    maxWidth: '100%',
                    maxHeight: '100%',
                    display: 'block',
                    objectFit: 'contain',
                    transition: 'opacity 0.3s',
                  }}
                  onLoad={onImageLoad}
                />
              </ReactCrop>
              {regions.length > 0 && (
                <div 
                  style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '100%', 
                    pointerEvents: 'none'
                  }}
                >
                  {regions.map((region, index) => {
                    const colorIndex = index % regionColors.length;
                    return (
                      <div
                        key={region.id}
                        className="region-overlay"
                        style={{
                          position: 'absolute',
                          left: `${region.crop.x}px`,
                          top: `${region.crop.y}px`,
                          width: `${region.crop.width}px`,
                          height: `${region.crop.height}px`,
                          backgroundColor: regionColors[colorIndex],
                          border: `1px solid ${regionBorderColors[colorIndex]}`,
                          boxSizing: 'border-box',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          padding: '2px',
                        }}
                      >
                        <div 
                          style={{
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: `${Math.min(region.crop.width, region.crop.height) * 0.7}px`,
                            fontWeight: 'bold',
                            userSelect: 'none',
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            textAlign: 'center',
                          }}
                        >
                          {index + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {renderSelectionGuide()}
            </>
          ) : (
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              p: 4,
              textAlign: 'center',
              color: 'text.secondary',
              minHeight: '300px',
              minWidth: '300px',
            }}>
              <CropIcon sx={{ fontSize: 48, opacity: 0.4 }} />
              <Typography variant="body2">
                Upload an image to begin
              </Typography>
            </Box>
          )}
        </div>
      </Box>
    </Box>
  );
};

export default ImageProcessor; 