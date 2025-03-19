import { useState, useRef } from 'react';
import { Box, Typography, Paper, Fade, useTheme } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ImageIcon from '@mui/icons-material/Image';

interface ImageUploaderProps {
  onImageUpload: (images: File[]) => void;
}

const ImageUploader = ({ onImageUpload }: ImageUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const theme = useTheme();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files: File[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (file.type.startsWith('image/')) {
          files.push(file);
        }
      }
      if (files.length > 0) {
        onImageUpload(files);
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        if (file.type.startsWith('image/')) {
          files.push(file);
        }
      }
      if (files.length > 0) {
        onImageUpload(files);
      }
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="subtitle2" gutterBottom sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ImageIcon fontSize="small" color="primary" />
        Upload Image
      </Typography>
      <Fade in={true}>
        <Paper
          sx={{
            p: 1,
            width: '100%',
            height: '50px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDragging 
              ? 'rgba(245, 158, 11, 0.08)' 
              : theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.03)'
                : 'rgba(0, 0, 0, 0.03)',
            border: '1px solid',
            borderColor: isDragging 
              ? 'primary.main' 
              : theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(0, 0, 0, 0.1)',
            cursor: 'pointer',
            borderRadius: 1,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.05)'
                : 'rgba(0, 0, 0, 0.05)',
              boxShadow: theme.palette.mode === 'dark'
                ? '0 0 0 1px rgba(255, 255, 255, 0.1)'
                : '0 0 0 1px rgba(0, 0, 0, 0.1)',
            },
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          elevation={0}
        >
          <CloudUploadIcon sx={{ 
            fontSize: 28, 
            color: isDragging ? 'primary.main' : 'primary.main', 
            mr: 2,
            transition: 'color 0.2s',
          }} />
          <Typography variant="body2" color={isDragging ? 'primary.main' : 'text.secondary'}>
            Click or drag images here
          </Typography>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept="image/*"
            multiple
          />
        </Paper>
      </Fade>
    </Box>
  );
};

export default ImageUploader; 