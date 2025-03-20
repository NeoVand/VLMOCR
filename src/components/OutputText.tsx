import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Stack, useTheme, IconButton, Tooltip } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import StopIcon from '@mui/icons-material/Stop';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';

// Colors for region highlighting
const getRegionColors = (isDark: boolean) => [
  isDark ? 'rgba(224, 140, 22, 0.7)' : 'rgba(217, 119, 6, 0.7)', // amber
  isDark ? 'rgba(14, 165, 233, 0.7)' : 'rgba(3, 105, 161, 0.7)',  // sky blue
  isDark ? 'rgba(34, 197, 94, 0.7)' : 'rgba(22, 163, 74, 0.7)',   // green
  isDark ? 'rgba(168, 85, 247, 0.7)' : 'rgba(147, 51, 234, 0.7)', // purple
  isDark ? 'rgba(239, 68, 68, 0.7)' : 'rgba(220, 38, 38, 0.7)',   // red
  isDark ? 'rgba(251, 146, 60, 0.7)' : 'rgba(234, 88, 12, 0.7)',  // orange
];

// Enhanced region interface with additional metadata
interface RegionWithStatus extends Region {
  status: 'queued' | 'generating' | 'complete';
  text: string;
  // Store original index to preserve titles after deletions
  originalIndex: number;
}

// Generation entry structure for history
interface GenerationEntry {
  id: string;
  timestamp: Date;
  text: string;
  regions: RegionWithStatus[];
  isComplete: boolean;
  fullImageData?: string | null; // Store full image data for when no regions are selected
}

// Base Region interface
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

interface OutputTextProps {
  text: string;
  isLoading: boolean;
  onClear?: () => void;
  onStop?: () => void;
  regions?: Region[];
  fullImageData?: string | null; // Add prop to receive full image data
}

const OutputText = ({ text, isLoading, onClear, onStop, regions = [], fullImageData = null }: OutputTextProps) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const regionColors = getRegionColors(isDarkMode);
  
  // Preserve all generations in history
  const [history, setHistory] = useState<GenerationEntry[]>([]);
  
  // Current generation ID being processed
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  
  // Current region index being processed
  const [currentRegionIndex, setCurrentRegionIndex] = useState<number>(-1);
  
  // Current editable text (latest generation or user edited)
  const [editableText, setEditableText] = useState<string>(text);
  
  // Track if user has modified the text
  const [userModified, setUserModified] = useState<boolean>(false);
  
  // Scroll container reference
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Utility to find a region in the current generation by originalIndex
  
  // Start a new generation when isLoading becomes true
  useEffect(() => {
    if (isLoading && (!currentGenerationId || history.length === 0)) {
      // Create generation ID
      const genId = `gen-${Date.now()}`;
      setCurrentGenerationId(genId);
      
      // Prepare regions with status and original index for stable titles
      const regionsWithStatus: RegionWithStatus[] = regions.map((region, index) => ({
        ...region,
        status: index === 0 ? 'generating' : 'queued',
        text: '',
        originalIndex: index
      }));
      
      // If no regions, create a "full image" placeholder
      if (regionsWithStatus.length === 0) {
        regionsWithStatus.push({
          id: `full-image-${Date.now()}`,
          crop: { x: 0, y: 0, width: 0, height: 0 },
          imageData: '',  // This will be empty, but we'll use fullImageData instead for rendering
          status: 'generating',
          text: '',
          originalIndex: 0
        });
      }
      
      // Set current region index
      setCurrentRegionIndex(0);
      
      // Create a new history entry
      const newEntry: GenerationEntry = {
        id: genId,
        timestamp: new Date(),
        text: '',
        regions: regionsWithStatus,
        isComplete: false,
        fullImageData: fullImageData // Store the full image data for rendering
      };
      
      setHistory(prev => [...prev, newEntry]);
      
      // Scroll to bottom
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [isLoading, regions, fullImageData]);
  
  // Track when text updates indicate a new region is being processed
  useEffect(() => {
    if (isLoading && currentGenerationId && text) {
      // Look for region markers in the text
      const regionMarkers = text.match(/Region (\d+):/g);
      
      if (regionMarkers && regionMarkers.length > 0) {
        // Get all the region numbers mentioned in the text
        const regionNumbers = regionMarkers.map(marker => {
          const match = marker.match(/Region (\d+):/);
          return match ? parseInt(match[1], 10) : -1;
        }).filter(num => num > 0);
        
        // Find the highest region number mentioned
        const maxRegionNumber = Math.max(...regionNumbers);
        
        // Find the entry being processed
        const entryIndex = history.findIndex(entry => entry.id === currentGenerationId);
        if (entryIndex !== -1) {
          const entry = history[entryIndex];
          
          // Find which of our regions corresponds to this number (based on originalIndex + 1)
          const currentRegion = entry.regions.find(r => r.originalIndex + 1 === maxRegionNumber);
          
          if (currentRegion) {
            // Find the array index of this region
            const newRegionIndex = entry.regions.findIndex(r => r.id === currentRegion.id);
            
            // If we've moved to a new region, update statuses and currentRegionIndex
            if (newRegionIndex !== currentRegionIndex && newRegionIndex !== -1) {
              setCurrentRegionIndex(newRegionIndex);
              
              // Update region statuses
              setHistory(prev => {
                const updatedHistory = [...prev];
                const updatedEntry = { ...updatedHistory[entryIndex] };
                const updatedRegions = [...updatedEntry.regions];
                
                // Mark previous regions as complete
                for (let i = 0; i < updatedRegions.length; i++) {
                  if (i < newRegionIndex) {
                    updatedRegions[i] = {
                      ...updatedRegions[i],
                      status: 'complete'
                    };
                  } else if (i === newRegionIndex) {
                    updatedRegions[i] = {
                      ...updatedRegions[i],
                      status: 'generating'
                    };
                  }
                }
                
                updatedEntry.regions = updatedRegions;
                updatedHistory[entryIndex] = updatedEntry;
                
                return updatedHistory;
              });
            }
          }
        }
      }
    }
  }, [text, isLoading, currentGenerationId, currentRegionIndex, history]);
  
  // Process text updates during streaming for each region
  useEffect(() => {
    if (isLoading && currentGenerationId && text) {
      // Get the current generation entry
      const generationIndex = history.findIndex(gen => gen.id === currentGenerationId);
      
      if (generationIndex !== -1) {
        const updatedHistory = [...history];
        const currentGeneration = { ...updatedHistory[generationIndex] };
        
        // Extract text for each region
        currentGeneration.regions.forEach((region, idx) => {
          // Each region is identified by its originalIndex + 1 in the text
          const regionNumber = region.originalIndex + 1;
          const regionPattern = new RegExp(`Region ${regionNumber}:\\s*([\\s\\S]*?)(?=\\s*Region \\d+:|$)`, 'i');
          const match = text.match(regionPattern);
          
          if (match && match[1]) {
            const regionText = match[1].trim();
            
            // Only update the text if it's different
            if (region.text !== regionText) {
              const updatedRegions = [...currentGeneration.regions];
              updatedRegions[idx] = {
                ...updatedRegions[idx],
                text: regionText
              };
              
              currentGeneration.regions = updatedRegions;
            }
          } else if (currentGeneration.regions.length === 1) {
            // Single region case - use all text
            const updatedRegions = [...currentGeneration.regions];
            updatedRegions[idx] = {
              ...updatedRegions[idx],
              text: text
            };
            
            currentGeneration.regions = updatedRegions;
          }
        });
        
        // Update the complete text for the generation
        currentGeneration.text = text;
        
        updatedHistory[generationIndex] = currentGeneration;
        setHistory(updatedHistory);
        
        // If not modified by user, update editable text too
        if (!userModified) {
          setEditableText(text);
        }
      }
    }
  }, [text, isLoading, currentGenerationId, history]);
  
  // Handle region transitions and completion
  useEffect(() => {
    // When loading stops, mark the current generation as complete
    if (!isLoading && currentGenerationId) {
      setHistory(prev => prev.map(entry => 
        entry.id === currentGenerationId 
          ? { 
              ...entry, 
              isComplete: true,
              regions: entry.regions.map(r => ({ ...r, status: 'complete' }))
            } 
          : entry
      ));
      
      // Reset current generation state
      setCurrentGenerationId(null);
      setCurrentRegionIndex(-1);
    }
  }, [isLoading, currentGenerationId]);

  // Handle export
  const handleExport = () => {
    // Only export what's currently visible
    const blob = new Blob([editableText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted_text.txt';
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle clear
  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all generated text and history?')) {
      setEditableText('');
      setHistory([]);
      setUserModified(false);
      setCurrentGenerationId(null);
      setCurrentRegionIndex(-1);
      
      if (onClear) {
        onClear();
      }
    }
  };

  // Handle text edits
  
  // Handle stop generation
  const handleStopGeneration = () => {
    if (onStop) {
      onStop();
    }
  };
  
  // Handle delete generation entry
  
  // Handle delete specific region
  const handleDeleteRegion = (generationId: string, regionId: string) => {
    setHistory(prev => {
      const updatedHistory = [...prev];
      const genIndex = updatedHistory.findIndex(gen => gen.id === generationId);
      
      if (genIndex !== -1) {
        const entry = updatedHistory[genIndex];
        
        // If this is the only region in the generation, delete the whole generation
        if (entry.regions.length <= 1) {
          // Remove the whole generation
          return prev.filter(entry => entry.id !== generationId);
        }
        
        // If this is the current generation and the region is being processed,
        // stop the generation
        if (generationId === currentGenerationId && isLoading) {
          const regionIndex = entry.regions.findIndex(r => r.id === regionId);
          if (regionIndex === currentRegionIndex || 
              entry.regions[regionIndex].status === 'generating') {
            handleStopGeneration();
          }
        }
        
        // Otherwise, just filter out this specific region
        const updatedRegions = entry.regions.filter(region => region.id !== regionId);
        
        // Update the generation with filtered regions
        updatedHistory[genIndex] = {
          ...entry,
          regions: updatedRegions
        };
      }
      
      return updatedHistory;
    });
  };
  
  // Handle cancel queued region
  const handleCancelRegion = (generationId: string, regionId: string) => {
    // For queued regions, just delete them since they haven't started yet
    handleDeleteRegion(generationId, regionId);
  };

  // Render status indicator for a region
  const renderRegionStatus = (status: 'queued' | 'generating' | 'complete', genId: string, regionId: string) => {
    switch (status) {
      case 'generating':
        return (
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <Box sx={{ 
              width: '14px', 
              height: '14px', 
              borderRadius: '50%', 
              borderTop: `2px solid ${theme.palette.primary.main}`,
              borderRight: '2px solid transparent',
              animation: 'spin 1s linear infinite' 
            }} />
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              Generating...
            </Typography>
            <Tooltip title="Stop generating">
              <IconButton 
                size="small" 
                color="error"
                onClick={handleStopGeneration}
                sx={{ ml: 0.5, p: 0.5 }}
              >
                <StopIcon sx={{ fontSize: '14px' }} />
              </IconButton>
            </Tooltip>
          </Box>
        );
        
      case 'queued':
        return (
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <PendingIcon sx={{ fontSize: '14px', color: theme.palette.text.disabled }} />
            <Typography variant="caption" sx={{ color: theme.palette.text.disabled }}>
              Queued
            </Typography>
            <Tooltip title="Cancel region">
              <IconButton 
                size="small" 
                color="default"
                onClick={() => handleCancelRegion(genId, regionId)}
                sx={{ ml: 0.5, p: 0.5 }}
              >
                <CancelIcon sx={{ fontSize: '14px' }} />
              </IconButton>
            </Tooltip>
          </Box>
        );
        
      default:
        return null;
    }
  };

  // Render the history of generations
  const renderHistory = () => {
    if (history.length === 0) {
      return (
        <Box sx={{ 
          p: 2, 
          color: theme.palette.text.secondary,
          textAlign: 'center',
          fontSize: '0.9rem' 
        }}>
          No generation history yet
        </Box>
      );
    }
    
    return (
      <Box>
        {history.map((entry) => (
          <Box 
            key={entry.id}
            sx={{ 
              mb: 3,
              position: 'relative',
              '&:last-child': { mb: 0 }
            }}
          >
            {/* Render each region with its thumbnail and text */}
            {entry.regions.map((region) => {
              // Use regionIndex for color assignment
              const colorIndex = region.originalIndex % regionColors.length;
              const regionColor = regionColors[colorIndex];
              
              // Determine the image source for the thumbnail
              // Use region image if available, otherwise use fullImageData
              const isFullImageRegion = entry.regions.length === 1 && (!region.imageData || region.imageData === '');
              const imageSource = isFullImageRegion ? entry.fullImageData : region.imageData;
              
              // Check if this is the currently generating region
              const isGenerating = !entry.isComplete && entry.id === currentGenerationId && region.status === 'generating';
              const isQueued = !entry.isComplete && entry.id === currentGenerationId && region.status === 'queued';
              
              return (
                <Box 
                  key={`${entry.id}-region-${region.id}`} 
                  sx={{ 
                    mb: 2,
                    p: 2,
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.03)' 
                      : 'rgba(0, 0, 0, 0.02)',
                    borderRadius: 1,
                    border: `1px solid ${theme.palette.divider}`,
                    borderLeft: `3px solid ${regionColor}`,
                    position: 'relative',
                    '&:hover .delete-button': {
                      opacity: 1,
                    }
                  }}
                >
                  {/* Delete button that appears on hover - only for completed regions */}
                  {!isGenerating && !isQueued && (
                    <Tooltip title="Delete" placement="top">
                      <IconButton
                        className="delete-button"
                        size="small"
                        color="error"
                        onClick={() => handleDeleteRegion(entry.id, region.id)}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          p: 0.5,
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)',
                          '&:hover': {
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)',
                          }
                        }}
                      >
                        <HighlightOffIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  
                  {/* Region header with thumbnail and status */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 1.5, 
                    justifyContent: 'space-between' 
                  }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1.5 
                    }}>
                      {/* Region thumbnail */}
                      <Box 
                        sx={{ 
                          width: 60, 
                          height: 48, 
                          flexShrink: 0,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                          overflow: 'hidden',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          backgroundColor: theme.palette.background.paper,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {imageSource ? (
                          <img 
                            src={imageSource} 
                            alt={`Region ${region.originalIndex + 1}`}
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: '100%', 
                              objectFit: 'contain' 
                            }} 
                          />
                        ) : (
                          <Box sx={{ color: theme.palette.text.disabled, fontSize: '0.7rem' }}>
                            No image
                          </Box>
                        )}
                      </Box>
                      
                      {/* Region title - use original index for stability */}
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          color: regionColor,
                          fontWeight: 600,
                          fontSize: '0.85rem'
                        }}
                      >
                        {isFullImageRegion ? 'Full Image' : `Region ${region.originalIndex + 1}`}
                      </Typography>
                    </Box>
                    
                    {/* Status indicator */}
                    {!entry.isComplete && renderRegionStatus(region.status, entry.id, region.id)}
                  </Box>
                  
                  {/* Region content */}
                  <Box sx={{ 
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                    pl: 0.5,
                    minHeight: '1.5em' // Ensure enough space when empty
                  }}>
                    {region.text || (
                      region.status === 'complete' 
                        ? 'No text generated for this region' 
                        : region.status === 'generating'
                          ? 'Generating...'
                          : 'Waiting...'
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    );
  };

  // Main component render
  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToyIcon fontSize="small" color="primary" />
          Generated Text Output
        </Typography>
      </Box>
      
      {/* Scrollable content area */}
      <Box 
        ref={scrollContainerRef}
        sx={{ 
          flex: 1, 
          minHeight: 0,
          overflow: 'auto',
          mb: 2,
          position: 'relative',
          pr: 1,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.2)' 
              : 'rgba(0, 0, 0, 0.2)',
            borderRadius: '3px',
          },
        }}
      >
        {/* Content */}
        {!isLoading && history.length === 0 ? (
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: theme.palette.text.secondary,
            textAlign: 'center',
            gap: 2
          }}>
            <SmartToyIcon sx={{ fontSize: '2rem', opacity: 0.5 }} />
            <Typography variant="body2">
              Generated text will appear here.
              <br />
              Select a region and click Generate to start.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ p: 1 }}>
            {renderHistory()}
          </Box>
        )}
      </Box>
      
      {/* Action buttons */}
      <Stack 
        direction="row" 
        spacing={1.5} 
        sx={{ 
          justifyContent: 'flex-end',
          flexShrink: 0
        }}
      >
        <Button
          variant="outlined"
          color="primary"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
          disabled={!editableText || (isLoading && history.length === 0)}
          sx={{
            minWidth: '100px',
            backgroundColor: !editableText 
              ? 'transparent' 
              : theme.palette.mode === 'dark' 
                ? 'rgba(224, 140, 22, 0.08)' 
                : 'rgba(217, 119, 6, 0.08)',
          }}
        >
          Export
        </Button>
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<DeleteIcon />}
          onClick={handleClear}
          disabled={history.length === 0 || (isLoading && history.length <= 1)}
          sx={{
            minWidth: '100px',
            backgroundColor: (history.length === 0)
              ? 'transparent' 
              : theme.palette.mode === 'dark' 
                ? 'rgba(239, 68, 68, 0.08)' 
                : 'rgba(220, 38, 38, 0.08)',
          }}
        >
          Clear
        </Button>
      </Stack>
    </Box>
  );
};

export default OutputText; 