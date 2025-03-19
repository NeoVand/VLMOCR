import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Paper, Stack, Fade } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';

// Import the region colors from ImageProcessor
const regionColors = [
  'rgba(245, 158, 11, 0.7)', // amber (darker for text)
  'rgba(14, 165, 233, 0.7)',  // sky blue
  'rgba(34, 197, 94, 0.7)',   // green
  'rgba(168, 85, 247, 0.7)',  // purple
  'rgba(239, 68, 68, 0.7)',   // red
  'rgba(251, 146, 60, 0.7)',  // orange
];

interface OutputTextProps {
  text: string;
  isLoading: boolean;
  onClear?: () => void;
  regions?: any[]; // Optional regions array
}

const OutputText = ({ text, isLoading, onClear, regions = [] }: OutputTextProps) => {
  // We'll maintain our own local editable copy of the text
  const [editableText, setEditableText] = useState<string>(text);
  const [formattedHtml, setFormattedHtml] = useState<string>("");
  const textFieldRef = useRef<HTMLDivElement>(null);
  
  // Track if user has modified the text
  const [userModified, setUserModified] = useState<boolean>(false);
  
  // Update text only if user hasn't modified it, or if we need to append new content
  useEffect(() => {
    // If we're still generating or user hasn't modified, update the text
    if (!userModified || isLoading) {
      setEditableText(text);
      
      // Create formatted HTML with region colors
      if (text && regions.length > 0) {
        try {
          let result = '';
          
          // Split text into sections based on double newlines, but keep track of the actual content
          const textSegments = text.split(/\n\n(?=Region \d+:)/);
          
          // Process each region
          for (let i = 0; i < regions.length; i++) {
            const colorIndex = i % regionColors.length;
            const colorStyle = `color: ${regionColors[colorIndex]};`;
            const regionHeader = `<div><span style="${colorStyle} font-weight: bold;">Region ${i + 1}:</span></div>`;
            
            // Find the corresponding text segment for this region
            let regionContent = '';
            // Look for a text segment that starts with "Region X:" or take the segment at the index
            const regionPattern = new RegExp(`Region ${i + 1}:`, 'i');
            const matchingSegment = textSegments.find(segment => regionPattern.test(segment));
            
            if (matchingSegment) {
              // Remove the "Region X:" prefix if it exists and format the content
              regionContent = matchingSegment.replace(regionPattern, '').trim();
            } else if (i < textSegments.length) {
              // If no explicit match, use segment by index
              regionContent = textSegments[i];
            }
            
            // Add the formatted region content
            result += regionHeader + regionContent.replace(/\n/g, '<br>');
            
            // Add spacing between regions
            if (i < regions.length - 1) {
              result += '<br><br>';
            }
          }
          
          // If there's remaining text that doesn't correspond to any region, add it at the end
          if (textSegments.length > regions.length) {
            for (let i = regions.length; i < textSegments.length; i++) {
              // Skip segments that already contain region markers
              if (!/Region \d+:/i.test(textSegments[i])) {
                result += '<br><br>' + textSegments[i].replace(/\n/g, '<br>');
              }
            }
          }
          
          setFormattedHtml(result);
        } catch (e) {
          // If there's an error formatting, just use plain text
          console.error('Error formatting text with regions:', e);
          setFormattedHtml(text.replace(/\n/g, '<br>'));
        }
      } else {
        // If there are no regions or no text, just use plain text
        setFormattedHtml(text.replace(/\n/g, '<br>'));
      }
    }
  }, [text, regions, userModified, isLoading]);

  const handleExport = () => {
    // Create a blob with the text (plain text without HTML)
    const blob = new Blob([editableText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create a link and click it
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted_text.txt';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all generated text?')) {
      setEditableText('');
      setFormattedHtml('');
      setUserModified(false); // Reset modification state
      
      // Notify parent to clear its text state too
      if (onClear) {
        onClear();
      }
    }
  };

  // Handle user input/edits
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.innerText;
    setEditableText(content);
    setUserModified(true);
  };

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <Typography variant="subtitle2" gutterBottom>
        Generated text output (editable)
      </Typography>
      
      {/* Container with fixed height and scrollable content */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex',
        flexDirection: 'column',
        mb: 2,
        overflow: 'hidden',
        minHeight: 0, // Important for flex containers to enable scrolling
        position: 'relative',
      }}>
        <Paper 
          elevation={0} 
          variant="outlined" 
          sx={{ 
            flex: 1,
            borderRadius: 1, 
            overflow: 'hidden',
            display: 'flex',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderColor: 'rgba(255, 255, 255, 0.12)',
            },
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              padding: '16px',
              color: 'inherit',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              overflow: 'auto',
            }}
          >
            {!editableText && !isLoading ? (
              <div style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Generated text will appear here...</div>
            ) : (
              <div 
                ref={textFieldRef}
                dangerouslySetInnerHTML={{ __html: formattedHtml || (isLoading ? 'Generating...' : '') }} 
                contentEditable={!isLoading}
                onInput={handleInput}
                style={{
                  outline: 'none',
                  whiteSpace: 'pre-wrap',
                  color: isLoading && !formattedHtml ? 'rgba(255, 255, 255, 0.5)' : 'inherit'
                }}
              />
            )}
          </div>
        </Paper>
        
        {isLoading && (
          <Fade in={isLoading}>
            <Box sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: 2,
              padding: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              zIndex: 10,
            }}>
              <Box sx={{ 
                width: '20px', 
                height: '20px', 
                borderRadius: '50%', 
                borderTop: '2px solid #f59e0b',
                borderRight: '2px solid transparent',
                mr: 1.5,
                animation: 'spin 1s linear infinite' 
              }} />
              <Typography variant="body2">Generating...</Typography>
            </Box>
          </Fade>
        )}
      </Box>
      
      {/* Buttons in a separate container */}
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
          disabled={!editableText || isLoading}
          sx={{
            minWidth: '100px',
            backgroundColor: !editableText ? 'transparent' : 'rgba(245, 158, 11, 0.08)',
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
          disabled={!editableText || isLoading}
          sx={{
            minWidth: '100px',
            backgroundColor: !editableText ? 'transparent' : 'rgba(239, 68, 68, 0.08)',
          }}
        >
          Clear
        </Button>
      </Stack>
    </Box>
  );
};

export default OutputText; 