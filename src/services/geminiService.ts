import { GoogleGenerativeAI } from '@google/generative-ai';

// Lazy initialization - only check API key when actually used
let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    genAI = new GoogleGenerativeAI(API_KEY);
  }
  return genAI;
}

function getApiKey(): string {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }
  return API_KEY;
}

interface CharacterData {
  name: string;
  height: string;
  mass: string;
  hair_color: string;
  skin_color: string;
  eye_color: string;
  gender: string;
  birth_year: string;
}

export class GeminiService {
  /**
   * Generate a detailed prompt for image generation based on character data
   */
  private generateImagePrompt(character: CharacterData): string {
    return `Create a vibrant, animated-style illustration of a Star Wars character: ${character.name}. 
The character should have:
- Height: ${character.height} cm
- Hair color: ${character.hair_color}
- Skin color: ${character.skin_color}
- Eye color: ${character.eye_color}
- Gender: ${character.gender}
- Birth year: ${character.birth_year}

Style: Animated, colorful, sci-fi fantasy art style inspired by Star Wars aesthetic. 
The image should be dynamic, vibrant with rich colors, and capture the essence of the character.
Make it visually striking with a Star Wars universe atmosphere.`;
  }

  /**
   * Generate image using Gemini Imagen API
   * Note: The exact endpoint format may vary based on Gemini API version
   * Adjust the endpoint URL if needed based on Google's current documentation
   */
  async generateCharacterImage(character: CharacterData): Promise<string> {
    try {
      // Generate the prompt
      const prompt = this.generateImagePrompt(character);

      // Try the Imagen API endpoint
      // If this doesn't work, check Google's documentation for the correct endpoint
      const API_KEY = getApiKey();
      const imagenEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages?key=${API_KEY}`;
      
      console.log('Attempting to generate image with prompt:', prompt.substring(0, 100) + '...');
      
      const response = await fetch(imagenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          number_of_images: 1,
          aspect_ratio: '1:1',
        }),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        console.error('Gemini API Error Response:', responseText);
        console.error('Response status:', response.status);
        
        // Try alternative endpoint (Imagen 4)
        console.log('Trying alternative Imagen 4 endpoint...');
        return this.tryAlternativeEndpoint(prompt);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', responseText);
        throw new Error('Invalid JSON response from API');
      }
      
      // Handle different possible response formats
      if (data.generatedImages && data.generatedImages[0]) {
        const imageBase64 = data.generatedImages[0].imageBase64 || 
                           data.generatedImages[0].bytesBase64Encoded ||
                           data.generatedImages[0].bytes;
        if (imageBase64) {
          return `data:image/png;base64,${imageBase64}`;
        }
      }
      
      // Alternative response format check
      if (data.predictions && data.predictions[0]) {
        const imageBase64 = data.predictions[0].bytesBase64Encoded || 
                           data.predictions[0].imageBase64 ||
                           data.predictions[0].bytes;
        if (imageBase64) {
          return `data:image/png;base64,${imageBase64}`;
        }
      }

      // Check for images array
      if (data.images && data.images[0]) {
        const imageBase64 = data.images[0].base64 || data.images[0].imageBase64;
        if (imageBase64) {
          return `data:image/png;base64,${imageBase64}`;
        }
      }

      // If we get a different format, log it for debugging
      console.error('Unexpected response format:', JSON.stringify(data, null, 2));
      throw new Error('Invalid response format from Gemini API. Check logs for actual response.');
    } catch (error) {
      console.error('Error generating image:', error);
      if (error instanceof Error && error.message.includes('alternative')) {
        throw error; // Re-throw if already tried alternative
      }
      throw error;
    }
  }

  /**
   * Try alternative endpoint format (Imagen 4 or different API version)
   */
  private async tryAlternativeEndpoint(prompt: string): Promise<string> {
    try {
        // Try Imagen 4 endpoint
      const API_KEY = getApiKey();
      const alternativeEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:generateImages?key=${API_KEY}`;
      
      const response = await fetch(alternativeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          number_of_images: 1,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Image generation failed on both endpoints. Status: ${response.status}. Error: ${errorData}`);
      }

      const data = await response.json();
      
      // Same response parsing logic
      if (data.generatedImages?.[0]?.imageBase64 || data.generatedImages?.[0]?.bytesBase64Encoded) {
        return `data:image/png;base64,${data.generatedImages[0].imageBase64 || data.generatedImages[0].bytesBase64Encoded}`;
      }
      
      throw new Error('Alternative endpoint returned invalid format');
    } catch (error) {
      throw new Error(`Image generation failed. Please check:
1. Your Gemini API key is valid and has Imagen access
2. The API endpoint format in src/services/geminiService.ts matches Google's current documentation
3. Your free tier includes image generation capabilities
Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Alternative method: Use Gemini to generate an enhanced prompt
   * This can be used with other image generation services
   */
  async generateEnhancedPrompt(character: CharacterData): Promise<string> {
    try {
      const model = getGenAI().getGenerativeModel({ model: 'gemini-pro' });
      
      const basePrompt = this.generateImagePrompt(character);
      const enhancementPrompt = `Enhance this image generation prompt to be more detailed and vivid: ${basePrompt}
      
Return ONLY the enhanced prompt, nothing else.`;

      const result = await model.generateContent(enhancementPrompt);
      const response = await result.response;
      const enhancedPrompt = response.text();
      
      return enhancedPrompt.trim();
    } catch (error) {
      console.error('Error generating enhanced prompt:', error);
      return this.generateImagePrompt(character); // Fallback to original
    }
  }
}

export const geminiService = new GeminiService();
