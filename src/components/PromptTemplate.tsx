import { useState, useRef, useEffect } from 'react';
import { Box, Typography, TextField } from '@mui/material';

interface PromptTemplateProps {
  onChange: (template: string) => void;
}

const PromptTemplate = ({ onChange }: PromptTemplateProps) => {
  const [template, setTemplate] = useState<string>(
    'Analyze the image and extract all visible text. Format your response as plain text, preserving the layout as seen in the image.'
  );
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  // Auto-expand textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set the height to scrollHeight to fit the content
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [template]);

  const handleTemplateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTemplate = event.target.value;
    setTemplate(newTemplate);
    onChange(newTemplate);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="subtitle2" gutterBottom>
        Prompt Template
      </Typography>
      <TextField
        multiline
        minRows={1}
        value={template}
        onChange={handleTemplateChange}
        placeholder="Enter your prompt template..."
        size="small"
        variant="outlined"
        InputProps={{
          inputRef: textareaRef,
          sx: {
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.875rem',
            lineHeight: 1.5,
          }
        }}
        fullWidth
        sx={{
          '& .MuiOutlinedInput-root': {
            transition: 'all 0.2s ease-in-out',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            },
            '&.Mui-focused': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.2)',
            },
          },
          '& textarea': {
            overflow: 'hidden',
          },
        }}
      />
    </Box>
  );
};

export default PromptTemplate; 