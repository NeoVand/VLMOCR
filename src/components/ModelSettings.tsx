import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Select, 
  MenuItem, 
  FormControl, 
  Slider, 
  TextField,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import ollama from 'ollama';
import ChipIcon from '@mui/icons-material/Memory';
import RulerIcon from '@mui/icons-material/Straighten';
import ThermostatIcon from '@mui/icons-material/Thermostat';

interface ModelSettingsProps {
  onModelChange: (model: string) => void;
  onContextLengthChange: (length: number) => void;
  onTemperatureChange: (temp: number) => void;
  onSeedChange: (seed: number) => void;
}

const ModelSettings = ({ 
  onModelChange, 
  onContextLengthChange, 
  onTemperatureChange, 
  onSeedChange 
}: ModelSettingsProps) => {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [contextLength, setContextLength] = useState<number>(8192);
  const [temperature, setTemperature] = useState<number>(0.2);
  const [seed, setSeed] = useState<number>(42);
  const [fixedSeed, setFixedSeed] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setIsLoading(true);
        const response = await ollama.list();
        console.log('Available models:', response.models);
        
        // Show all available models
        const availableModels = response.models;
        
        setModels(availableModels.map(model => model.name));
        if (availableModels.length > 0) {
          setSelectedModel(availableModels[0].name);
          onModelChange(availableModels[0].name);
        }
      } catch (error) {
        console.error("Failed to fetch models:", error);
        setModels([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchModels();
  }, [onModelChange]);

  const handleModelChange = (event: any) => {
    setSelectedModel(event.target.value);
    onModelChange(event.target.value);
  };

  const handleContextLengthChange = (_event: any, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    setContextLength(value);
    onContextLengthChange(value);
  };

  const handleTemperatureChange = (_event: any, newValue: number | number[]) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    setTemperature(value);
    onTemperatureChange(value);
  };

  const handleSeedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value)) {
      setSeed(value);
      onSeedChange(value);
    }
  };

  const handleFixedSeedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFixedSeed(event.target.checked);
    if (!event.target.checked) {
      const randomSeed = Math.floor(Math.random() * 1000000);
      setSeed(randomSeed);
      onSeedChange(randomSeed);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="subtitle2" gutterBottom sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ChipIcon fontSize="small" color="primary" />
        Model
      </Typography>
      <FormControl fullWidth size="small" sx={{ mb: 3 }}>
        <Select
          value={selectedModel}
          onChange={handleModelChange}
          displayEmpty
          disabled={isLoading || models.length === 0}
          sx={{
            '&.MuiOutlinedInput-root': {
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
              },
            },
          }}
        >
          {isLoading ? (
            <MenuItem value="">Loading models...</MenuItem>
          ) : models.length === 0 ? (
            <MenuItem value="">No models found</MenuItem>
          ) : (
            models.map((model) => (
              <MenuItem key={model} value={model}>
                {model}
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>

      <Typography variant="subtitle2" gutterBottom sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <RulerIcon fontSize="small" color="primary" />
        Context Length
      </Typography>
      <Box sx={{ px: 1, mb: 3 }}>
        <Slider
          value={contextLength}
          onChange={handleContextLengthChange}
          min={2048}
          max={32768}
          step={null}
          marks={[
            { value: 2048, label: '2k' },
            { value: 4096, label: '4k' },
            { value: 8192, label: '8k' },
            { value: 16384, label: '16k' },
            { value: 32768, label: '32k' },
          ]}
        />
      </Box>

      <Typography variant="subtitle2" gutterBottom sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ThermostatIcon fontSize="small" color="primary" />
        Temperature
      </Typography>
      <Box sx={{ px: 1, mb: 3 }}>
        <Slider
          value={temperature}
          onChange={handleTemperatureChange}
          min={0}
          max={1.0}
          step={0.1}
          marks={[
            { value: 0, label: '0' },
            { value: 0.2, label: '0.2' },
            { value: 0.4, label: '0.4' },
            { value: 0.6, label: '0.6' },
            { value: 0.8, label: '0.8' },
            { value: 1.0, label: '1.0' },
          ]}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <FormControlLabel
          control={
            <Checkbox 
              checked={fixedSeed} 
              onChange={handleFixedSeedChange}
              size="small"
            />
          }
          label={
            <Typography variant="subtitle2">
              Fixed Seed
            </Typography>
          }
          sx={{ m: 0 }}
        />
        {fixedSeed && (
          <TextField
            type="number"
            value={seed}
            onChange={handleSeedChange}
            variant="outlined"
            size="small"
            sx={{ 
              width: '100px',
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
              },
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default ModelSettings; 