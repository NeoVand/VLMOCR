// Custom implementation of Ollama API for browser compatibility
// This file serves as a drop-in replacement for the Ollama library

// Default Ollama API endpoint
const OLLAMA_API = 'http://localhost:11434/api';

interface ModelResponse {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parameter_size: string;
    family: string;
    [key: string]: any;
  };
}

interface ListResponse {
  models: ModelResponse[];
}

interface GenerateRequest {
  model: string;
  prompt: string;
  images?: string[];
  options?: {
    temperature?: number;
    num_ctx?: number;
    seed?: number;
    [key: string]: any;
  };
  onProgress?: (text: string) => void;
}

interface GenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

class OllamaApi {
  private baseUrl: string;
  private abortController: AbortController | null = null;

  constructor(baseUrl: string = OLLAMA_API) {
    this.baseUrl = baseUrl;
  }

  // Method to stop ongoing generation
  abort() {
    if (this.abortController) {
      console.log('Aborting ongoing request');
      try {
        this.abortController.abort('User cancelled the operation');
      } catch (error) {
        console.warn('Error aborting request:', error);
      } finally {
        this.abortController = null;
      }
    }
  }

  async list(): Promise<ListResponse> {
    console.log('Fetching models via fetch API...');
    try {
      const response = await fetch(`${this.baseUrl}/tags`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Models response:', data);
      return data;
    } catch (error) {
      console.error('Error fetching models:', error);
      throw error;
    }
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    console.log('Generating with request:', {
      ...request,
      images: request.images ? [`${request.images.length} image(s)`] : undefined
    });
    
    // Create a new AbortController for this request
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    
    // Extract onProgress callback if provided
    const { onProgress, ...apiRequest } = request;
    
    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiRequest),
        signal, // Pass the abort signal to fetch
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ollama API error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      // Handle the stream manually to accumulate the full response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is null');
      }
      
      let accumulatedResponse = '';
      let finalResponse: GenerateResponse | null = null;
      
      // Process the response stream
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Convert the chunk to text
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              
              // Only send the current response chunk, not the accumulated text
              if (onProgress && data.response) {
                onProgress(data.response);
              }
              
              // Add to the accumulated response for the final result
              accumulatedResponse += data.response || '';
              
              // Store the latest response
              finalResponse = data;
            } catch (e) {
              console.warn('Failed to parse JSON line:', line, e);
            }
          }
        }
      } catch (error: any) {
        // Check if the operation was aborted
        if (error.name === 'AbortError') {
          console.log('Request was aborted by user');
          const abortResponse: GenerateResponse = {
            model: apiRequest.model,
            created_at: new Date().toISOString(),
            response: accumulatedResponse + "\n[Generation stopped by user]",
            done: true
          };
          
          this.abortController = null;
          return abortResponse;
        }
        throw error;
      } finally {
        this.abortController = null;
      }
      
      if (!finalResponse) {
        throw new Error('No valid response received from Ollama');
      }
      
      // Return the final accumulated response
      return {
        ...finalResponse,
        response: accumulatedResponse
      };
    } catch (error: any) {
      // Special handling for abort errors at the fetch level
      if (error.name === 'AbortError') {
        console.log('Fetch request was aborted by user');
        const abortResponse: GenerateResponse = {
          model: apiRequest.model || 'unknown',
          created_at: new Date().toISOString(),
          response: "[Generation stopped by user]",
          done: true
        };
        
        this.abortController = null;
        return abortResponse;
      }
      
      console.error('Error generating:', error);
      this.abortController = null;
      throw error;
    }
  }

  async chat(request: any): Promise<any> {
    console.log('Chat request:', request);
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error in chat:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export default new OllamaApi(); 