import { Box, Typography, Paper, Stack } from '@mui/material';

interface ImageGridProps {
  images: File[];
  selectedImageIndex: number;
  onImageSelect: (index: number) => void;
}

const ImageGrid = ({ images, selectedImageIndex, onImageSelect }: ImageGridProps) => {
  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="subtitle2" gutterBottom>
        Upload Images
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{ overflowX: 'auto', pb: 0.5 }}>
        {images.length > 0 ? (
          images.map((image, index) => (
            <Paper
              key={index}
              sx={{
                width: '60px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                cursor: 'pointer',
                border: index === selectedImageIndex ? '2px solid' : '1px solid',
                borderColor: index === selectedImageIndex ? 'primary.main' : 'rgba(255, 255, 255, 0.12)',
                borderRadius: 1,
                flexShrink: 0,
                bgcolor: 'background.paper',
              }}
              onClick={() => onImageSelect(index)}
              elevation={0}
            >
              <img
                src={URL.createObjectURL(image)}
                alt={`Image ${index + 1}`}
                style={{
                  maxHeight: '100%',
                  maxWidth: '100%',
                  objectFit: 'contain',
                }}
              />
            </Paper>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            No images uploaded yet.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export default ImageGrid; 