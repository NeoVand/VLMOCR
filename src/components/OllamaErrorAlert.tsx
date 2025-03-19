import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  useTheme,
  IconButton,
  Link,
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import HelpIcon from '@mui/icons-material/Help';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

interface OllamaErrorAlertProps {
  onClose: () => void;
}

const OllamaErrorAlert: React.FC<OllamaErrorAlertProps> = ({ onClose }) => {
  const theme = useTheme();
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({});
  const [deploymentUrl, setDeploymentUrl] = useState<string>('');
  
  const isWindows = navigator.platform.toLowerCase().includes('win');
  const isLocalNetwork = window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(window.location.hostname) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(window.location.hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(window.location.hostname);

  useEffect(() => {
    // Get the current deployment URL dynamically
    const currentUrl = window.location.origin;
    setDeploymentUrl(currentUrl);
  }, []);

  const handleCopyCommand = (command: string, key: string) => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopied(prev => ({ ...prev, [key]: false }));
      }, 2000);
    });
  };

  const renderStartupInstructions = () => {
    return (
      <>
        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 500 }}>
          First Time Setup:
        </Typography>
        <Box component="ol" sx={{ mt: 0, pl: 2 }}>
          <li>
            <Typography variant="body2" color="text.secondary">
              Install Ollama from <Link href="https://ollama.com" target="_blank" rel="noopener">ollama.com</Link>
            </Typography>
          </li>
          <li>
            <Typography variant="body2" color="text.secondary">
              Pull a model (e.g., granite3.2-vision or gemma3) by running:
            </Typography>
            <Box sx={{ 
              bgcolor: theme.palette.mode === 'dark' 
                ? '#1A1A1A'
                : '#F5F5F5',
              p: 2,
              my: 1,
              borderRadius: 1,
              border: `1px solid ${theme.palette.divider}`,
              position: 'relative'
            }}>
              <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', mb: 1 }}>
                ollama pull granite3.2-vision
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => handleCopyCommand('ollama pull granite3.2-vision', 'pull')}
                sx={{ position: 'absolute', right: 8, top: 8 }}
              >
                {copied['pull'] ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
              </IconButton>
            </Box>
          </li>
          {!isLocalNetwork && isWindows && (
            <li>
              <Typography variant="body2" color="text.secondary">
                Set up the environment variable:
              </Typography>
              <Box sx={{ 
                bgcolor: theme.palette.mode === 'dark' 
                  ? '#1A1A1A'
                  : '#F5F5F5',
                p: 2,
                my: 1,
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`,
                position: 'relative'
              }}>
                <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', mb: 1 }}>
                  setx OLLAMA_ORIGINS "{deploymentUrl}"
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => handleCopyCommand(`setx OLLAMA_ORIGINS "${deploymentUrl}"`, 'setx')}
                  sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                  {copied['setx'] ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                </IconButton>
              </Box>
            </li>
          )}
          <li>
            <Typography variant="body2" color="text.secondary">
              Start Ollama:
            </Typography>
            <Box sx={{ 
              bgcolor: theme.palette.mode === 'dark' 
                ? '#1A1A1A'
                : '#F5F5F5',
              p: 2,
              my: 1,
              borderRadius: 1,
              border: `1px solid ${theme.palette.divider}`,
              position: 'relative'
            }}>
              <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', mb: 1 }}>
                {isLocalNetwork || isWindows ? 
                  'ollama serve' : 
                  `OLLAMA_ORIGINS="${deploymentUrl}" ollama serve`}
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => handleCopyCommand(
                  isLocalNetwork || isWindows ? 'ollama serve' : `OLLAMA_ORIGINS="${deploymentUrl}" ollama serve`, 
                  'serve'
                )}
                sx={{ position: 'absolute', right: 8, top: 8 }}
              >
                {copied['serve'] ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
              </IconButton>
            </Box>
          </li>
        </Box>
      </>
    );
  };

  return (
    <Dialog 
      open={true} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        color: theme.palette.error.main
      }}>
        <ErrorIcon />
        <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
          Cannot Connect to Ollama
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
          Ollama service is not running or cannot be reached. Please follow the instructions below to start Ollama.
        </Typography>
        
        {renderStartupInstructions()}

        <Box sx={{ 
          mt: 3,
          p: 2,
          bgcolor: theme.palette.mode === 'dark' 
            ? '#1A1A1A'
            : '#F5F5F5',
          borderRadius: 1,
          border: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <HelpIcon fontSize="small" sx={{ color: theme.palette.primary.main }} />
          <Typography variant="body2" color="text.secondary">
            After starting Ollama, refresh this page to reconnect.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={onClose}
          variant="contained"
          sx={{
            borderRadius: 1,
            textTransform: 'none',
            px: 3
          }}
        >
          Dismiss
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OllamaErrorAlert; 