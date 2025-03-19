import ollama from './ollamaFetch';

export interface GenerateOptions {
  model: string;
  prompt: string;
  image: string | null;
  temperature?: number;
  contextLength?: number;
  seed?: number;
  onProgress?: (text: string) => void;
}

export interface ModelInfo {
  name: string;
  modifiedAt: Date;
  size: number;
}

class OllamaService {
  /**
   * List available models from Ollama
   */
  async listModels(): Promise<string[]> {
    try {
      console.log('Fetching models from Ollama...');
      const response = await ollama.list();
      console.log('Models found:', response.models);
      return response.models.map(model => model.name);
    } catch (error) {
      console.error('Failed to fetch models from Ollama:', error);
      throw new Error(`Failed to connect to Ollama: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Stop ongoing generation
   */
  abort(): void {
    try {
      console.log('Aborting generation from service');
      ollama.abort();
    } catch (error) {
      console.warn('Error during abort:', error);
      // Rethrow a more friendly error message
      throw new Error('Unable to stop generation');
    }
  }

  /**
   * Generate text from an image using Ollama
   */
  async generateFromImage(options: GenerateOptions): Promise<string> {
    try {
      if (!options.image) {
        throw new Error('No image provided');
      }

      console.log('Generating from image with model:', options.model);
      
      // Remove the data:image/jpeg;base64, part if it exists
      let base64Image = options.image;
      if (base64Image.includes(',')) {
        base64Image = base64Image.split(',')[1];
      }
      
      if (!base64Image) {
        throw new Error('Invalid image format');
      }
      
      console.log('Image size (base64):', Math.round(base64Image.length / 1024), 'KB');

      const generateRequest = {
        model: options.model,
        prompt: options.prompt,
        images: [base64Image],
        options: {
          temperature: options.temperature || 0.2,
          num_ctx: options.contextLength || 8192,
          seed: options.seed || 42,
        },
        onProgress: (partialText: string) => {
          // Only pass the current chunk to the progress callback
          if (options.onProgress) {
            options.onProgress(partialText);
          }
        }
      };

      // Log request details without including the full image
      console.log('Request details:', {
        model: generateRequest.model,
        prompt: generateRequest.prompt,
        options: generateRequest.options,
        imageIncluded: !!base64Image
      });

      try {
        const response = await ollama.generate(generateRequest);
        console.log('Generation successful, response length:', response.response.length);
        return response.response;
      } catch (error: any) {
        // Handle abort separately - return partial result
        if (error.name === 'AbortError' || 
            (error.message && (
              error.message.includes('aborted') || 
              error.message.includes('cancel') || 
              error.message.includes('stopped by user')
            ))) {
          console.log('Generation was stopped by user');
          return "[Generation stopped by user]";
        }
        
        console.error('Ollama API error:', error.message);
        throw new Error(`Ollama API error: ${error.message}`);
      }
    } catch (error: any) {
      // Special handling for abort errors
      if (error.name === 'AbortError' || 
          (error.message && (
            error.message.includes('aborted') || 
            error.message.includes('cancel') || 
            error.message.includes('stopped by user')
          ))) {
        console.log('Generation was stopped by user in outer catch');
        return "[Generation stopped by user]";
      }
      
      console.error('Failed to generate from image:', error);
      throw error;
    }
  }

  /**
   * Check if Ollama service is running
   */
  async checkOllamaStatus(): Promise<boolean> {
    try {
      console.log('Checking Ollama status...');
      await ollama.list();
      console.log('Ollama is running');
      return true;
    } catch (error) {
      console.error('Ollama service not running or connection issue:', error);
      return false;
    }
  }
}

const ollamaService = new OllamaService();
export default ollamaService; 