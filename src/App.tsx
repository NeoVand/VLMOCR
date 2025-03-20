import { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Typography, CssBaseline, Container, Grid, AppBar, Toolbar, Alert, IconButton, useMediaQuery } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ImageUploader from './components/ImageUploader';
import ModelSettings from './components/ModelSettings';
import PromptTemplate from './components/PromptTemplate';
import ImageProcessor from './components/ImageProcessor';
import ImageGrid from './components/ImageGrid';
import OutputText from './components/OutputText';
import OllamaErrorAlert from './components/OllamaErrorAlert';
import ollamaService from './services/ollamaService';
import { createAppTheme } from './theme';
import './App.css';

// Define Region interface
interface Region {
  id: string;
  crop: {
    x: number;
    y: number;
    width: number;
    height: number;
    unit?: string;
  };
  imageData: string;
}

function App() {
  // Theme state
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState<'light' | 'dark'>(prefersDarkMode ? 'dark' : 'dark');
  
  // Create the theme object
  const themeObject = useMemo(() => createAppTheme(mode), [mode]);
  
  // Toggle theme mode
  const toggleThemeMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // Effect to update body class based on theme
  useEffect(() => {
    document.body.classList.remove('light-mode', 'dark-mode');
    document.body.classList.add(`${mode}-mode`);
    
    // Also update the region selection colors in CSS properties
    // The color is now set in ImageProcessor.tsx based on the current region index
    const root = document.documentElement;
    if (mode === 'dark') {
      // Default selection colors for dark mode (amber)
      root.style.setProperty('--selection-color', 'rgba(224, 140, 22, 0.35)');
      root.style.setProperty('--selection-border', 'rgba(224, 140, 22, 0.7)');
      
      // Default CSS variables for backward compatibility
      root.style.setProperty('--next-region-color', 'rgba(224, 140, 22, 0.35)');
      root.style.setProperty('--next-region-border', 'rgba(224, 140, 22, 0.7)');
    } else {
      // Default selection colors for light mode (amber) 
      root.style.setProperty('--selection-color', 'rgba(217, 119, 6, 0.35)');
      root.style.setProperty('--selection-border', 'rgba(217, 119, 6, 0.7)');
      
      // Default CSS variables for backward compatibility
      root.style.setProperty('--next-region-color', 'rgba(217, 119, 6, 0.35)');
      root.style.setProperty('--next-region-border', 'rgba(217, 119, 6, 0.7)');
    }
  }, [mode]);

  // State for uploaded images
  const [images, setImages] = useState<File[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  const [currentImage, setCurrentImage] = useState<File | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);

  // State for column width
  const [leftColumnWidth, setLeftColumnWidth] = useState<number>(25);
  const [middleColumnWidth, setMiddleColumnWidth] = useState<number>(45);
  const [rightColumnWidth, setRightColumnWidth] = useState<number>(30);
  const [isDraggingLeft, setIsDraggingLeft] = useState<boolean>(false);
  const [isDraggingRight, setIsDraggingRight] = useState<boolean>(false);
  const [startX, setStartX] = useState<number>(0);
  const [startLeftWidth, setStartLeftWidth] = useState<number>(0);
  const [startMiddleWidth, setStartMiddleWidth] = useState<number>(0);
  const [startRightWidth, setStartRightWidth] = useState<number>(0);

  // Refs for drag handles
  const containerRef = useRef<HTMLDivElement>(null);

  // State for model settings
  const [model, setModel] = useState<string>('');
  const [contextLength, setContextLength] = useState<number>(8192);
  const [temperature, setTemperature] = useState<number>(0.2);
  const [seed, setSeed] = useState<number>(42);
  const [promptTemplate, setPromptTemplate] = useState<string>(
    'Analyze the image and extract all visible text. Format your response as plain text, preserving the layout as seen in the image.'
  );

  // State for generation results
  const [generatedText, setGeneratedText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  // State for error handling
  const [error, setError] = useState<string | null>(null);
  const [isOllamaError, setIsOllamaError] = useState<boolean>(false);

  // State for sidebar collapse
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Calculate the actual image source for when no regions are selected
  const imgSrc = currentImage ? URL.createObjectURL(currentImage) : null;
  
  // Reference to hold the full image data
  const [fullImageData, setFullImageData] = useState<string | null>(null);
  
  // Convert selected image to proper format for processing when it changes
  useEffect(() => {
    const convertImageToDataUrl = async () => {
      if (currentImage) {
        try {
          // Create a FileReader to read the image file
          const reader = new FileReader();
          
          // Set up the onload handler
          reader.onload = (e) => {
            if (e.target && typeof e.target.result === 'string') {
              setFullImageData(e.target.result);
            }
          };
          
          // Read the image file as a data URL
          reader.readAsDataURL(currentImage);
        } catch (error) {
          console.error('Error converting image to data URL:', error);
          setFullImageData(null);
        }
      } else {
        setFullImageData(null);
      }
    };
    
    convertImageToDataUrl();
  }, [currentImage]);

  // Handle resize events
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      // Prevent default selection behavior
      e.preventDefault();
      
      const containerWidth = containerRef.current.clientWidth;

      if (isDraggingLeft) {
        const deltaX = e.clientX - startX;
        const newLeftWidth = Math.max(15, Math.min(40, startLeftWidth + (deltaX / containerWidth) * 100));
        const newMiddleWidth = startMiddleWidth - ((newLeftWidth - startLeftWidth) / 100) * 100;

        if (newMiddleWidth >= 30) {
          setLeftColumnWidth(newLeftWidth);
          setMiddleColumnWidth(newMiddleWidth);
        }
      } else if (isDraggingRight) {
        const deltaX = e.clientX - startX;
        const newRightWidth = Math.max(20, Math.min(40, startRightWidth - (deltaX / containerWidth) * 100));
        const newMiddleWidth = startMiddleWidth + ((startRightWidth - newRightWidth) / 100) * 100;

        if (newMiddleWidth >= 30) {
          setRightColumnWidth(newRightWidth);
          setMiddleColumnWidth(newMiddleWidth);
        }
      }
    };
    
    // Touch move handler for mobile devices
    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current || e.touches.length === 0) return;
      
      // Prevent default behavior (scrolling, zooming)
      e.preventDefault();
      
      const touch = e.touches[0];
      const containerWidth = containerRef.current.clientWidth;

      if (isDraggingLeft) {
        const deltaX = touch.clientX - startX;
        const newLeftWidth = Math.max(15, Math.min(40, startLeftWidth + (deltaX / containerWidth) * 100));
        const newMiddleWidth = startMiddleWidth - ((newLeftWidth - startLeftWidth) / 100) * 100;

        if (newMiddleWidth >= 30) {
          setLeftColumnWidth(newLeftWidth);
          setMiddleColumnWidth(newMiddleWidth);
        }
      } else if (isDraggingRight) {
        const deltaX = touch.clientX - startX;
        const newRightWidth = Math.max(20, Math.min(40, startRightWidth - (deltaX / containerWidth) * 100));
        const newMiddleWidth = startMiddleWidth + ((startRightWidth - newRightWidth) / 100) * 100;

        if (newMiddleWidth >= 30) {
          setRightColumnWidth(newRightWidth);
          setMiddleColumnWidth(newMiddleWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
      
      // Remove dragging class from document body
      document.body.classList.remove('dragging-active');
    };
    
    // Touch end handler for mobile devices
    const handleTouchEnd = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
      
      // Remove dragging class from document body
      document.body.classList.remove('dragging-active');
    };

    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('touchcancel', handleTouchEnd);
      
      // Add dragging class to document body
      document.body.classList.add('dragging-active');
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
      document.body.classList.remove('dragging-active');
    };
  }, [isDraggingLeft, isDraggingRight, startX, startLeftWidth, startMiddleWidth, startRightWidth]);

  // Start dragging for left handle
  const startDraggingLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingLeft(true);
    setStartX(e.clientX);
    setStartLeftWidth(leftColumnWidth);
    setStartMiddleWidth(middleColumnWidth);
    
    // Add dragging class to document body immediately
    document.body.classList.add('dragging-active');
  };

  // Start dragging for right handle
  const startDraggingRight = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingRight(true);
    setStartX(e.clientX);
    setStartRightWidth(rightColumnWidth);
    setStartMiddleWidth(middleColumnWidth);
    
    // Add dragging class to document body immediately
    document.body.classList.add('dragging-active');
  };

  // Check if Ollama is running
  useEffect(() => {
    const checkOllama = async () => {
      try {
        console.log('Checking if Ollama service is running...');
        const isRunning = await ollamaService.checkOllamaStatus();
        console.log('Ollama running status:', isRunning);
        
        if (!isRunning) {
          setError('Ollama service is not running or cannot be reached.');
          setIsOllamaError(true);
        }
      } catch (error) {
        console.error('Error checking Ollama status:', error);
        setError('Failed to connect to Ollama.');
        setIsOllamaError(true);
      }
    };
    
    checkOllama();
  }, []);

  // Handle image upload - now accepts multiple images
  const handleImageUpload = (newImages: File[]) => {
    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
      const newIndex = images.length; // Set to the first of the new images
      setSelectedImageIndex(newIndex);
      setCurrentImage(newImages[0]);
    }
  };

  // Handle image selection from grid
  const handleImageSelect = (index: number) => {
    setSelectedImageIndex(index);
    setCurrentImage(images[index]);
    // Reset regions when changing images
    setRegions([]);
  };

  // Handle crop complete
  const handleCropComplete = (image: string | null) => {
    setCroppedImage(image);
  };

  // Handle multiple regions
  const handleMultipleRegions = (newRegions: Region[]) => {
    console.log('Updating regions:', newRegions.length);
    setRegions(newRegions);
    
    // If regions are cleared, revert to the full image
    if (newRegions.length === 0) {
      setCroppedImage(null);
    }
  };

  // Generate text from image
  const handleGenerate = async () => {
    if (!model) {
      setError('Please select a model first.');
      return;
    }

    if (!currentImage && !croppedImage) {
      setError('Please upload an image first.');
      return;
    }
    
    // Check if we have valid image data to process
    if (!regions.length && !croppedImage && !fullImageData) {
      setError('Image is not ready for processing. Please try again.');
      return;
    }

    setIsGenerating(true);
    setGeneratedText(''); // Clear previous text
    let accumulatedText = ''; // Local variable to accumulate text during this generation
    
    try {
      // If there are regions, process them sequentially
      if (regions.length > 0) {
        // Use regions in their original order (no sorting)
        const regionsToProcess = [...regions];
        
        console.log(`Processing ${regionsToProcess.length} regions...`);
        
        // Process each region sequentially
        for (let i = 0; i < regionsToProcess.length; i++) {
          const region = regionsToProcess[i];
          console.log(`Processing region ${i + 1}/${regionsToProcess.length}`);
          
          try {
            const response = await ollamaService.generateFromImage({
              model,
              prompt: promptTemplate,
              image: region.imageData,
              temperature,
              contextLength,
              seed,
              onProgress: (textChunk) => {
                // For the first chunk of this region, add a region header
                if (i === 0 && accumulatedText === '') {
                  accumulatedText = `Region 1:\n${textChunk}`;
                  setGeneratedText(accumulatedText);
                } else if (accumulatedText.endsWith(`Region ${i + 1}:\n`)) {
                  // If we just added the header, don't prefix the chunk
                  accumulatedText += textChunk;
                  setGeneratedText(accumulatedText);
                } else {
                  // Normal progress for subsequent chunks
                  accumulatedText += textChunk;
                  setGeneratedText(accumulatedText);
                }
              }
            });
            
            // Check if the response includes a stop message (added by the abort handler)
            if (response && response.includes("[Generation stopped by user]")) {
              // Generation was stopped by user, stop processing more regions
              break;
            }
            
            // Add a newline between regions and the region header for the next region
            if (i < regionsToProcess.length - 1) {
              accumulatedText += '\n\nRegion ' + (i + 2) + ':\n';
              setGeneratedText(accumulatedText);
            }
          } catch (error: any) {
            // Check specifically for our custom abort message
            if (error.message === 'Request aborted by user' || 
                (error.message && error.message.includes('stopped by user'))) {
              // User stopped the generation
              accumulatedText += '\n\n[Generation stopped by user]';
              setGeneratedText(accumulatedText);
              break;
            } else {
              throw error;
            }
          }
        }
      } else {
        // Process single image or crop
        try {
          await ollamaService.generateFromImage({
            model,
            prompt: promptTemplate,
            image: croppedImage || fullImageData,
            temperature,
            contextLength,
            seed,
            onProgress: (textChunk) => {
              // For the first chunk, add a region header if we're processing a single region
              if (accumulatedText === '') {
                // If there's a cropped image or a single image, treat it as Region 1
                accumulatedText = `Region 1:\n${textChunk}`;
              } else {
                // Append the new chunk to our accumulated text
                accumulatedText += textChunk;
              }
              // Update UI with the full text so far
              setGeneratedText(accumulatedText);
            }
          });
        } catch (error: any) {
          // Only rethrow if it's not an abort error
          if (error.message !== 'Request aborted by user' && 
              !(error.message && error.message.includes('stopped by user'))) {
            throw error;
          }
        }
      }
      
      console.log(`Generation complete, added ${accumulatedText.length} characters`);
      
    } catch (error: any) {
      console.error('Generation failed:', error);
      // Don't show error for abort operations
      if (!error.message || (
          error.message !== 'Request aborted by user' && 
          !error.message.includes('stopped by user') &&
          !error.message.includes('aborted') &&
          !error.message.includes('cancel')
        )) {
        setError('Failed to generate text from image. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle stopping generation
  const handleStopGeneration = () => {
    console.log('Stopping generation...');
    try {
      ollamaService.abort();
    } catch (error) {
      console.error('Error stopping generation:', error);
      // Don't show this error to the user - handling internally
    }
  };

  // Handle error close
  const handleErrorClose = () => {
    setError(null);
    setIsOllamaError(false);
  };

  // Handle text clearing
  const handleTextClear = () => {
    console.log('App: Text cleared by user, resetting state');
    setGeneratedText('');
  };

  // Reset the root element styles
  useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      root.style.maxWidth = 'none';
      root.style.margin = '0';
      root.style.padding = '0';
      root.style.textAlign = 'left';
    }
  }, []);

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <ThemeProvider theme={themeObject}>
      <CssBaseline />
      <Box sx={{ 
        flexGrow: 1, 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden', // Prevent overflow at app level
      }}>
        <AppBar position="static" elevation={0} sx={{ 
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper'
        }}>
          <Toolbar variant="dense" sx={{ minHeight: '36px', height: '36px', px: 1.5 }}>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              sx={{ 
                mr: 1,
                transition: 'all 0.3s ease',
                transform: sidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                },
                padding: '4px',
                color: (theme) => theme.palette.text.primary,
              }}
              onClick={toggleSidebar}
            >
              <MenuIcon fontSize="small" />
            </IconButton>
            <Typography 
              variant="subtitle1" 
              component="div" 
              sx={{ 
                flexGrow: 1, 
                fontWeight: 500,
                fontSize: '0.95rem',
                letterSpacing: '0.01em',
                color: (theme) => theme.palette.text.primary
              }}
            >
              VLM OCR
            </Typography>
            <IconButton 
              edge="end"
              aria-label="toggle theme"
              onClick={toggleThemeMode}
              sx={{ 
                padding: '4px',
                ml: 1,
                color: (theme) => theme.palette.text.primary,
              }}
            >
              {mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
            </IconButton>
          </Toolbar>
        </AppBar>
        
        <Container 
          maxWidth={false} 
          disableGutters 
          sx={{ 
            flexGrow: 1, 
            display: 'flex',
            overflow: 'hidden', // Prevent overflow
            position: 'relative',
          }}
          ref={containerRef}
        >
          <Grid container sx={{ flexGrow: 1, height: 'calc(100vh - 36px)', overflow: 'hidden' }}>
            {/* Left Column (Collapsible Sidebar) */}
            <Grid 
              item
              sx={{ 
                width: `${leftColumnWidth}%`,
                height: '100%',
                borderRight: (theme) => `1px solid ${theme.palette.divider}`,
                transition: isDraggingLeft ? 'none' : 'transform 0.3s ease',
                transform: sidebarOpen ? 'translateX(0)' : `translateX(-100%)`,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.paper',
                position: 'absolute',
                left: 0,
                top: 0,
                zIndex: 10,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  gap: 3,
                  p: 3,
                  pt: 1,
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ 
                  flex: '0 0 auto',
                  mb: 1,
                }}>
                  <ImageUploader onImageUpload={handleImageUpload} />
                </Box>
                
                <Box sx={{ 
                  flex: 1, 
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  pr: 1, // Add padding right to account for scrollbar
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '3px',
                  },
                }}>
                  <ModelSettings
                    onModelChange={setModel}
                    onContextLengthChange={setContextLength}
                    onTemperatureChange={setTemperature}
                    onSeedChange={setSeed}
                  />
                  <PromptTemplate onChange={setPromptTemplate} />
                </Box>
              </Box>
              
              {/* Left resize handle */}
              <Box
                className="drag-handle"
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: -5,
                  width: 10,
                  height: '100%',
                  cursor: 'col-resize',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '&:hover': {
                    '& .resize-icon': {
                      opacity: 0.8,
                    },
                  },
                }}
                onMouseDown={startDraggingLeft}
                onTouchStart={(e) => {
                  e.preventDefault();
                  const touch = e.touches[0];
                  startDraggingLeft({
                    clientX: touch.clientX,
                    preventDefault: () => {}
                  } as React.MouseEvent);
                }}
              >
                <Box 
                  className="resize-icon"
                  sx={{ 
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                    width: 2,
                    height: '80%',
                    borderRadius: 4,
                    opacity: isDraggingLeft ? 0.8 : 0,
                    transition: 'opacity 0.2s',
                  }}
                />
              </Box>
            </Grid>
            
            {/* Middle Column */}
            <Grid 
              item
              sx={{ 
                width: sidebarOpen ? `${middleColumnWidth}%` : `${middleColumnWidth + leftColumnWidth}%`,
                height: '100%',
                transition: isDraggingLeft || isDraggingRight ? 'none' : 'all 0.3s ease',
                position: 'absolute',
                left: sidebarOpen ? `${leftColumnWidth}%` : 0,
                top: 0,
                zIndex: 5,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  gap: 0,
                  p: 0,
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ 
                  flex: '0 0 auto',
                  p: 3,
                  pt: 1,
                  pb: 2 
                }}>
                  <ImageGrid
                    images={images}
                    selectedImageIndex={selectedImageIndex}
                    onImageSelect={handleImageSelect}
                  />
                </Box>
                
                {/* Explicit border div that will definitely be visible */}
                <Box 
                  sx={{ 
                    height: '1px', 
                    backgroundColor: (theme) => theme.palette.divider,
                    width: '100%',
                    margin: 0,
                    padding: 0,
                  }} 
                />
                
                <Box sx={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  overflow: 'hidden',
                  borderRadius: 1,
                  backgroundColor: 'background.paper',
                  p: 3,
                  pt: 1
                }}>
                  <ImageProcessor
                    image={currentImage}
                    onCropComplete={handleCropComplete}
                    onGenerate={handleGenerate}
                    onMultipleRegions={handleMultipleRegions}
                    onStop={handleStopGeneration}
                    isGenerating={isGenerating}
                  />
                </Box>
              </Box>

              {/* Right resize handle */}
              <Box
                className="drag-handle"
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: -5,
                  width: 10,
                  height: '100%',
                  cursor: 'col-resize',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '&:hover': {
                    '& .resize-icon': {
                      opacity: 0.8,
                    },
                  },
                }}
                onMouseDown={startDraggingRight}
                onTouchStart={(e) => {
                  e.preventDefault();
                  const touch = e.touches[0];
                  startDraggingRight({
                    clientX: touch.clientX,
                    preventDefault: () => {}
                  } as React.MouseEvent);
                }}
              >
                <Box 
                  className="resize-icon"
                  sx={{ 
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                    width: 2,
                    height: '80%',
                    borderRadius: 4,
                    opacity: isDraggingRight ? 0.8 : 0,
                    transition: 'opacity 0.2s',
                  }}
                />
              </Box>
            </Grid>
            
            {/* Right Column */}
            <Grid 
              item
              sx={{ 
                width: `${rightColumnWidth}%`,
                height: '100%',
                transition: isDraggingRight ? 'none' : 'width 0.3s ease',
                borderLeft: (theme) => `1px solid ${theme.palette.divider}`,
                bgcolor: 'background.paper',
                position: 'absolute',
                right: 0,
                top: 0,
                zIndex: 5,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  p: 3,
                  pt: 1,
                }}
              >
                <OutputText 
                  text={generatedText} 
                  isLoading={isGenerating} 
                  onClear={handleTextClear}
                  regions={regions}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
        
        {error && isOllamaError && (
          <OllamaErrorAlert onClose={handleErrorClose} />
        )}
        
        {error && !isOllamaError && (
          <Box
            sx={{
              position: 'fixed',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              width: 'auto',
              maxWidth: '90%',
            }}
          >
            <Alert 
              onClose={handleErrorClose} 
              severity="error" 
              sx={{ 
                width: '100%',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                borderRadius: 1,
              }}
            >
              {error}
            </Alert>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}

export default App;
