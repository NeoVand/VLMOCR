import { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Typography, Button, Tooltip, Chip, Zoom, Fade, useTheme } from '@mui/material';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CheckBoxRoundedIcon from '@mui/icons-material/CheckBoxRounded';
import CropIcon from '@mui/icons-material/Crop';
import StopIcon from '@mui/icons-material/Stop';
import CancelPresentationRoundedIcon from '@mui/icons-material/CancelPresentationRounded';
import 'react-image-crop/dist/ReactCrop.css';

// Define colors for dark and light themes
const getRegionColors = (isDark: boolean) => ({
  bg: [
    isDark ? 'rgba(224, 140, 22, 0.35)' : 'rgba(217, 119, 6, 0.35)', // amber
    isDark ? 'rgba(14, 165, 233, 0.35)' : 'rgba(3, 105, 161, 0.35)',  // sky blue
    isDark ? 'rgba(34, 197, 94, 0.35)' : 'rgba(22, 163, 74, 0.35)',   // green
    isDark ? 'rgba(168, 85, 247, 0.35)' : 'rgba(147, 51, 234, 0.35)',  // purple
    isDark ? 'rgba(239, 68, 68, 0.35)' : 'rgba(220, 38, 38, 0.35)',   // red
    isDark ? 'rgba(251, 146, 60, 0.35)' : 'rgba(234, 88, 12, 0.35)',  // orange
  ],
  border: [
    isDark ? 'rgba(224, 140, 22, 0.7)' : 'rgba(217, 119, 6, 0.7)', // amber
    isDark ? 'rgba(14, 165, 233, 0.7)' : 'rgba(3, 105, 161, 0.7)',  // sky blue
    isDark ? 'rgba(34, 197, 94, 0.7)' : 'rgba(22, 163, 74, 0.7)',   // green
    isDark ? 'rgba(168, 85, 247, 0.7)' : 'rgba(147, 51, 234, 0.7)',  // purple
    isDark ? 'rgba(239, 68, 68, 0.7)' : 'rgba(220, 38, 38, 0.7)',   // red
    isDark ? 'rgba(251, 146, 60, 0.7)' : 'rgba(234, 88, 12, 0.7)',  // orange
  ]
});

interface Region {
  id: string;
  crop: PixelCrop & {
    originalWidth?: number;
    originalHeight?: number;
  };
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
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const colors = getRegionColors(isDarkMode);
  
  const regionColors = colors.bg;
  const regionBorderColors = colors.border;
  
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
    
    // Set up resize observer for the image
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => {
        // When image size changes, update region positions by forcing a re-render
        setRegions(prevRegions => [...prevRegions]);
      });
      
      // Start observing the image element
      resizeObserver.observe(img);
      
      // Clean up observer when component unmounts
      const cleanup = () => {
        resizeObserver.disconnect();
        img.removeEventListener('unload', cleanup);
      };
      
      // Add cleanup handler to image unload
      img.addEventListener('unload', cleanup);
    }
  }, []);

  // Get current scale factors based on displayed image size vs natural size
  const getScaleFactors = useCallback(() => {
    if (!imgRef.current) return { scaleX: 1, scaleY: 1 };
    
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
    
    return { scaleX, scaleY };
  }, []);

  // Calculate the scaling factor for displaying regions based on current image display size
  const getRegionScaleFactors = useCallback((region?: Region) => {
    if (!imgRef.current) return { scaleX: 1, scaleY: 1 };
    
    // Calculate the current displayed image dimensions
    const displayWidth = imgRef.current.width;
    const displayHeight = imgRef.current.height;
    
    // Use stored original dimensions if available, otherwise use natural dimensions
    const originalWidth = region?.crop.originalWidth || imgRef.current.naturalWidth;
    const originalHeight = region?.crop.originalHeight || imgRef.current.naturalHeight;
    
    // Return scaling factors (from original stored coordinates to current display)
    return {
      scaleX: displayWidth / originalWidth,
      scaleY: displayHeight / originalHeight
    };
  }, []);

  // Force update of region overlays when container size changes
  useEffect(() => {
    const handleResize = () => {
      // Force component re-render to update region positions
      setRegions(regions => [...regions]);
    };

    window.addEventListener('resize', handleResize);
    
    // Create a ResizeObserver to watch for image size changes
    if (typeof ResizeObserver !== 'undefined' && imgRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        // When image size changes, update region positions
        handleResize();
      });
      
      // Start observing the image element
      if (imgRef.current) {
        resizeObserver.observe(imgRef.current);
      }
      
      return () => {
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();
      };
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
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
      
      // Get current scale factors to store the original dimensions
      const { scaleX, scaleY } = getScaleFactors();
      
      // Create a region with the original coordinates in the image
      const originalCrop = {
        ...completedCrop,
        x: completedCrop.x * scaleX,
        y: completedCrop.y * scaleY,
        width: completedCrop.width * scaleX,
        height: completedCrop.height * scaleY,
        originalWidth: imgRef.current.naturalWidth,
        originalHeight: imgRef.current.naturalHeight
      };
      
      // Create a new region
      const regionId = `region-${Date.now()}`;
      const newRegion: Region = {
        id: regionId,
        crop: originalCrop,
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
    
    const primaryColor = theme.palette.primary.main;
    const backgroundColor = theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)';
    const textColor = theme.palette.mode === 'dark' ? '#fff' : '#000';
    
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
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.3)',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: backgroundColor,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              maxWidth: '80%',
            }}
          >
            <CropIcon style={{ fontSize: 32, opacity: 0.9, color: primaryColor }} />
            <Typography variant="subtitle2" sx={{ textAlign: 'center', color: textColor, fontWeight: 500 }}>
              Click and drag to select a region of the image
            </Typography>
            <div 
              style={{
                width: '120px',
                height: '80px',
                border: `2px dashed ${primaryColor}`,
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
              startIcon={<CheckBoxRoundedIcon />}
              onClick={saveRegion}
              disabled={!completedCrop || isGenerating}
              sx={{
                minWidth: '120px',
                backgroundColor: 'transparent',
                borderColor: !completedCrop 
                  ? undefined 
                  : getNextColor().border,
                color: !completedCrop 
                  ? undefined 
                  : getNextColor().border,
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
              startIcon={<CancelPresentationRoundedIcon />}
              onClick={resetAllRegions}
              disabled={regions.length === 0 || isGenerating}
              sx={{
                minWidth: '120px',
                backgroundColor: regions.length === 0 
                  ? 'transparent' 
                  : theme.palette.mode === 'dark'
                    ? 'rgba(239, 68, 68, 0.08)'
                    : 'rgba(220, 38, 38, 0.08)',
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
              startIcon={<AutoAwesomeRoundedIcon />}
              onClick={handleGenerate}
              disabled={!imgSrc || isGenerating}
              sx={{
                minWidth: '120px',
                backgroundImage: imgSrc && !isGenerating 
                  ? `linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                  : 'none',
                boxShadow: imgSrc && !isGenerating 
                  ? `0 2px 8px ${theme.palette.mode === 'dark' 
                    ? 'rgba(224, 140, 22, 0.3)' 
                    : 'rgba(217, 119, 6, 0.2)'}`
                  : 'none',
                bgcolor: (!imgSrc || isGenerating) 
                  ? theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.08)' 
                    : 'rgba(0, 0, 0, 0.08)'
                  : undefined,
                '& .MuiButton-startIcon': {
                  color: (!imgSrc || isGenerating) ? 'rgba(255, 255, 255, 0.3)' : undefined,
                },
                '&.Mui-disabled': {
                  color: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.3)' 
                    : 'rgba(0, 0, 0, 0.3)',
                }
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
                backgroundColor: theme.palette.mode === 'dark'
                  ? 'rgba(239, 68, 68, 0.08)'
                  : 'rgba(220, 38, 38, 0.08)',
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
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {regions.map((region, index) => {
                const colorIndex = index % regionColors.length;
                getRegionScaleFactors(region);
                
                // Calculate scaled coordinates and dimensions
                
                // Get image position to align overlays properly
                
                return (
                  <Zoom in={true} key={region.id} timeout={200}>
                    <Chip
                      label={`Region ${index + 1}`}
                      size="small"
                      variant="filled"
                      onDelete={() => deleteRegion(region.id)}
                      onClick={() => {
                        setCompletedCrop(region.crop);
                        setShowSelectionGuide(false);
                      }}
                      sx={{
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? regionBorderColors[colorIndex].replace('0.7', '0.3')
                          : regionBorderColors[colorIndex].replace('0.7', '0.2'),
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        height: '22px',
                        border: `1px solid ${regionBorderColors[colorIndex]}`,
                        boxShadow: 'none',
                        textShadow: 'none',
                        mr: 0.5,
                        mb: 0.5,
                        '&:hover': {
                          backgroundColor: regionBorderColors[colorIndex].replace('0.7', '0.4'),
                          cursor: 'pointer',
                        },
                        '& .MuiChip-deleteIcon': {
                          color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                          opacity: 0.7,
                          '&:hover': {
                            opacity: 1,
                            color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                          }
                        }
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
          border: (theme) => imgSrc 
            ? `1px solid ${theme.palette.divider}` 
            : 'none',
          borderRadius: 1,
          backgroundColor: 'background.paper',
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
                    pointerEvents: 'none',
                    zIndex: 10
                  }}
                >
                  {regions.map((region, index) => {
                    const colorIndex = index % regionColors.length;
                    const { scaleX, scaleY } = getRegionScaleFactors(region);
                    
                    // Calculate scaled coordinates and dimensions
                    const scaledX = region.crop.x * scaleX;
                    const scaledY = region.crop.y * scaleY;
                    const scaledWidth = region.crop.width * scaleX;
                    const scaledHeight = region.crop.height * scaleY;
                    
                    // Get image position to align overlays properly
                    const imagePosition = imgRef.current ? {
                      left: imgRef.current.offsetLeft || 0,
                      top: imgRef.current.offsetTop || 0
                    } : { left: 0, top: 0 };
                    
                    return (
                      <div
                        key={region.id}
                        className="region-overlay"
                        style={{
                          position: 'absolute',
                          left: `${imagePosition.left + scaledX}px`,
                          top: `${imagePosition.top + scaledY}px`,
                          width: `${scaledWidth}px`,
                          height: `${scaledHeight}px`,
                          backgroundColor: theme.palette.mode === 'dark'
                            ? regionColors[colorIndex]
                            : regionColors[colorIndex].replace('0.35', '0.2'),
                          border: `2px solid ${regionBorderColors[colorIndex]}`,
                          boxSizing: 'border-box',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          padding: '2px',
                        }}
                      >
                        <div 
                          style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: `${Math.min(scaledWidth, scaledHeight) * 0.65}px`,
                            fontWeight: 'bold',
                            userSelect: 'none',
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            textAlign: 'center',
                            textShadow: 'none',
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
              backgroundColor: 'background.paper',
              borderRadius: 1,
            }}>
              <CropIcon sx={{ fontSize: 48, opacity: 0.4, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
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