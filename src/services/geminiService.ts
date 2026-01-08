import { GoogleGenerativeAI } from '@google/generative-ai';
import { openaiService } from './openaiService';

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Lazy initialization - only check API key when actually used
let genAI: GoogleGenerativeAI | null = null;
let cachedGeminiKey: string | null = null;

function getGenAI(): GoogleGenerativeAI {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }

  // Reinitialize if API key changed or not yet initialized
  if (!genAI || cachedGeminiKey !== API_KEY) {
    console.log('🔑 Initializing Gemini API with new key...');
    genAI = new GoogleGenerativeAI(API_KEY);
    cachedGeminiKey = API_KEY;
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
   * List available models from Gemini API
   * Useful for debugging and finding available image generation models
   */
  async listAvailableModels(): Promise<any[]> {
    try {
      const API_KEY = getApiKey();
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.status}`);
      }

      const data = await response.json();

      if (data.models) {
        // Filter for models that might support image generation
        const imageModels = data.models.filter((model: any) =>
          model.name?.toLowerCase().includes('image') ||
          model.name?.toLowerCase().includes('imagen') ||
          model.supportedGenerationMethods?.includes('generateContent')
        );

        console.log('📋 Available models:', data.models.map((m: any) => m.name).join(', '));
        if (imageModels.length > 0) {
          console.log('🖼️ Models potentially supporting image generation:', imageModels.map((m: any) => m.name).join(', '));
        }

        return data.models;
      }
      return [];
    } catch (error) {
      console.error('❌ Error listing models:', error);
      return [];
    }
  }

  /**
   * Generate image using Google's Imagen API or alternative methods
   * Note: The gemini-2.0-flash-preview-image-generation model was deprecated.
   * This method tries multiple approaches to generate images.
   */
  async generateCharacterImage(character: CharacterData): Promise<string> {
    try {
      // Generate the prompt
      const prompt = this.generateImagePrompt(character);
      const API_KEY = getApiKey();

      console.log('🎨 Attempting to generate image with prompt:', prompt.substring(0, 100) + '...');

      // Default models to try if we can't find any via API
      // Note: Most Gemini models don't support image generation - Google's image generation
      // is typically done through Imagen API (Vertex AI), which requires different setup
      const defaultModelsToTry = [
        'gemini-3-pro-image-preview',
        'gemini-2.5-flash-exp',
        'gemini-2.0-flash-exp',
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro-latest'
      ];

      let modelsToTry: string[] = [];
      let lastError: Error | null = null;

      // First, try to list available models to see what's actually available
      try {
        console.log('🔍 Checking available models...');
        const availableModels = await this.listAvailableModels();

        // Look for any model that might support image generation
        const imageGenModel = availableModels.find((model: any) =>
          model.name?.toLowerCase().includes('image') ||
          model.name?.toLowerCase().includes('imagen')
        );

        if (imageGenModel) {
          console.log(`✅ Found potential image generation model: ${imageGenModel.name}`);
          const modelName = imageGenModel.name.replace('models/', '');
          modelsToTry.push(modelName);
        } else {
          // If no image-specific model found, try common models
          console.log('⚠️ No image-specific models found, will try common models...');
          modelsToTry = [...defaultModelsToTry];
        }
      } catch (listError) {
        console.log('⚠️ Could not list models, using default list...');
        modelsToTry = [...defaultModelsToTry];
      }

      // If modelsToTry is still empty, use defaults
      if (modelsToTry.length === 0) {
        modelsToTry = [...defaultModelsToTry];
      }


      // Try using Gemini models with generateContent (may not support image generation but worth trying)
      for (const modelName of modelsToTry) {
        try {
          console.log(`🎨 Trying model: ${modelName}...`);
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt
                }]
              }],
              generationConfig: {
                temperature: 0.7,
              }
            }),
          });

          const responseText = await response.text();

          if (!response.ok) {
            // If 404, try next model
            if (response.status === 404) {
              console.log(`⚠️ Model ${modelName} not found, trying next...`);
              continue;
            }
            throw new Error(`API returned status ${response.status}: ${responseText}`);
          }

          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('❌ Failed to parse JSON response:', responseText);
            continue; // Try next model
          }

          // Parse response format
          if (data.candidates && data.candidates[0]) {
            const candidate = data.candidates[0];
            if (candidate.content && candidate.content.parts) {
              for (const part of candidate.content.parts) {
                if (part.inlineData && part.inlineData.data) {
                  const mimeType = part.inlineData.mimeType || 'image/png';
                  console.log(`✅ Successfully generated image using model: ${modelName}`);
                  return `data:${mimeType};base64,${part.inlineData.data}`;
                }
              }
            }
          }

          // Check for alternative response format
          if (data.generatedImages && data.generatedImages[0]) {
            const imageBase64 = data.generatedImages[0].imageBase64 ||
              data.generatedImages[0].bytesBase64Encoded ||
              data.generatedImages[0].bytes;
            if (imageBase64) {
              console.log(`✅ Successfully generated image using model: ${modelName}`);
              return `data:image/png;base64,${imageBase64}`;
            }
          }
        } catch (modelError) {
          console.log(`⚠️ Model ${modelName} failed:`, modelError instanceof Error ? modelError.message : String(modelError));
          lastError = modelError instanceof Error ? modelError : new Error(String(modelError));
          continue; // Try next model
        }
      }

      // If all models failed, provide helpful error message
      console.error('❌ All image generation attempts failed');
      throw new Error(`Image generation failed. The gemini-2.0-flash-preview-image-generation model was deprecated.
      
Troubleshooting steps:
1. Use Google's Imagen API instead (requires separate setup): https://cloud.google.com/vertex-ai/docs/generative-ai/image/generate-images
2. Check available models by calling the listAvailableModels() method
3. Consider using a third-party image generation service (OpenAI DALL-E, Stability AI, etc.)
4. Your Gemini API key may need different permissions for image generation

Last error: ${lastError?.message || 'Unknown error'}

Alternative: Use the generateEnhancedPrompt() method to create a detailed prompt for use with other image generation services.`);
    } catch (error) {
      console.error('❌ Error generating image:', error);
      throw error;
    }
  }


  /**
   * Alternative method: Use Gemini to generate an enhanced prompt
   * This can be used with other image generation services
   */
  async generateEnhancedPrompt(character: CharacterData): Promise<string> {
    const basePrompt = this.generateImagePrompt(character);
    const enhancementPrompt = `Enhance this image generation prompt to be more detailed and vivid: ${basePrompt}
      
Return ONLY the enhanced prompt, nothing else.`;

    // Try multiple model names (gemini-pro is deprecated, using current models)
    const modelsToTry = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro',
      'gemini-1.5-pro-latest',
      'gemini-2.0-flash-exp'
    ];

    for (const modelName of modelsToTry) {
      try {
        const model = getGenAI().getGenerativeModel({ model: modelName });
        const result = await model.generateContent(enhancementPrompt);
        const response = await result.response;
        const enhancedPrompt = response.text();
        return enhancedPrompt.trim();
      } catch (error) {
        // Try next model if this one fails
        if (error instanceof Error && (
          error.message.includes('404') ||
          error.message.includes('not found') ||
          error.message.includes('is not supported')
        )) {
          continue;
        }
        // For other errors, log and try next
        console.log(`⚠️ Model ${modelName} failed for prompt enhancement, trying next...`);
        continue;
      }
    }

    // Fallback to original prompt if all models fail
    console.error('❌ All models failed for prompt enhancement, using original prompt');
    return basePrompt;
  }

  /**
   * Generate an anime sketch prompt from a character name using Gemini API
   * Returns a detailed prompt optimized for anime/manga sketch style image generation
   */
  async generateAnimeSketchPrompt(characterName: string): Promise<string> {
    const prompt = `Research the character "${characterName}" and create a detailed image generation prompt for an anime-style pencil sketch.

Requirements:
- Under 120 words
- Focus ONLY on visual details
- Style: Anime / manga / sketch style
- Include: facial features, hair, clothing, pose, mood, background, art style
- Format: Plain text prompt ready for image generation
- Do not include any explanations or meta-commentary, only the prompt itself

Character: ${characterName}`;

    // Use only free tier model: gemini-1.5-flash
    const modelsToTry = [
      'gemini-1.5-flash',
    ];

    let lastError: Error | null = null;

    console.log('🎨 Generating anime sketch prompt for:', characterName);

    for (const modelName of modelsToTry) {
      try {
        console.log(`🎨 Trying model: ${modelName}...`);
        const model = getGenAI().getGenerativeModel({ model: modelName });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const generatedPrompt = response.text().trim();

        console.log(`✅ Prompt generated successfully using model: ${modelName}`);
        return generatedPrompt;
      } catch (error) {
        console.log(`⚠️ Model ${modelName} failed:`, error instanceof Error ? error.message : String(error));
        lastError = error instanceof Error ? error : new Error(String(error));

        // For quota errors, try retrying with delay (only once)
        if (error instanceof Error && (
          error.message.includes('429') ||
          error.message.includes('quota') ||
          error.message.includes('RESOURCE_EXHAUSTED')
        )) {
          console.log(`⚠️ Model ${modelName} quota exceeded, waiting 5 seconds and retrying once...`);
          await delay(5000); // Wait 5 seconds
          try {
            const model = getGenAI().getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const generatedPrompt = response.text().trim();
            console.log(`✅ Prompt generated successfully after retry using model: ${modelName}`);
            return generatedPrompt;
          } catch (retryError) {
            console.log(`⚠️ Retry also failed for ${modelName}, moving to fallback...`);
            // Continue to fallback
          }
        }

        if (error instanceof Error && (
          error.message.includes('404') ||
          error.message.includes('not found') ||
          error.message.includes('is not supported')
        )) {
          continue;
        }

        if (error instanceof Error && error.message.includes('models/')) {
          continue;
        }
      }
    }

    // All Gemini models failed, fallback to OpenAI with retry
    console.log('⚠️ All Gemini models failed, falling back to OpenAI...');

    // If Gemini failed due to quota, wait a bit before trying OpenAI
    if (lastError && (lastError.message.includes('429') || lastError.message.includes('quota') || lastError.message.includes('RESOURCE_EXHAUSTED'))) {
      console.log('⏳ Waiting 3 seconds before trying OpenAI fallback...');
      await delay(3000);
    }

    try {
      const openaiPrompt = await openaiService.generateAnimeSketchPrompt(characterName);
      console.log('✅ Prompt generated successfully using OpenAI fallback');
      return openaiPrompt;
    } catch (openaiError) {
      console.error('❌ OpenAI fallback also failed:', openaiError);
      const openaiErrorMsg = openaiError instanceof Error ? openaiError.message : String(openaiError);

      // Provide helpful error messages based on the type of failure
      if (openaiErrorMsg.includes('quota') || openaiErrorMsg.includes('rate limit')) {
        throw new Error(`Both APIs have quota limits exceeded. Please wait 5-10 minutes before trying again. Free tier limits reset periodically. Check usage: Gemini (https://ai.google.dev/) and OpenAI (https://platform.openai.com/usage)`);
      }

      if (lastError) {
        if (lastError.message.includes('429') || lastError.message.includes('quota') || lastError.message.includes('RESOURCE_EXHAUSTED')) {
          throw new Error(`Both APIs have quota limits exceeded. Please wait 5-10 minutes before trying again. Free tier limits reset periodically.`);
        }
        throw new Error(`Failed to generate prompt with both Gemini and OpenAI. Gemini error: ${lastError.message.substring(0, 150)}. OpenAI error: ${openaiErrorMsg.substring(0, 150)}`);
      }
      throw new Error(`Failed to generate prompt. OpenAI fallback error: ${openaiErrorMsg}`);
    }
  }

  /**
   * Generate a short story about a Star Wars character using Gemini API
   * Tries multiple model names to ensure compatibility
   */
  async generateCharacterStory(character: CharacterData): Promise<string> {
    const storyPrompt = `Write a short, engaging story (300-500 words) about ${character.name}, a Star Wars character.

Character details:
- Name: ${character.name}
- Height: ${character.height} cm
- Mass: ${character.mass} kg
- Hair color: ${character.hair_color}
- Skin color: ${character.skin_color}
- Eye color: ${character.eye_color}
- Gender: ${character.gender}
- Birth year: ${character.birth_year}

Write an imaginative, Star Wars-themed short story that brings this character to life. 
The story should be engaging, well-written, and capture the essence of the Star Wars universe.
Make it dramatic, adventurous, and true to the Star Wars style.`;

    // Use only free tier model: gemini-1.5-flash
    const modelsToTry = [
      'gemini-1.5-flash',
    ];

    let lastError: Error | null = null;

    console.log('📖 Generating story for:', character.name);

    for (const modelName of modelsToTry) {
      try {
        console.log(`📖 Trying model: ${modelName}...`);
        const model = getGenAI().getGenerativeModel({ model: modelName });

        const result = await model.generateContent(storyPrompt);
        const response = await result.response;
        const story = response.text();

        console.log(`✅ Story generated successfully using model: ${modelName}`);
        return story.trim();
      } catch (error) {
        console.log(`⚠️ Model ${modelName} failed:`, error instanceof Error ? error.message : String(error));
        lastError = error instanceof Error ? error : new Error(String(error));

        // For quota errors, try retrying with delay (only once)
        if (error instanceof Error && (
          error.message.includes('429') ||
          error.message.includes('quota') ||
          error.message.includes('RESOURCE_EXHAUSTED')
        )) {
          console.log(`⚠️ Model ${modelName} quota exceeded, waiting 5 seconds and retrying once...`);
          await delay(5000); // Wait 5 seconds
          try {
            const model = getGenAI().getGenerativeModel({ model: modelName });
            const result = await model.generateContent(storyPrompt);
            const response = await result.response;
            const story = response.text();
            console.log(`✅ Story generated successfully after retry using model: ${modelName}`);
            return story.trim();
          } catch (retryError) {
            console.log(`⚠️ Retry also failed for ${modelName}, moving to fallback...`);
            // Continue to fallback
          }
        }

        // If it's a 404, try next model
        if (error instanceof Error && (
          error.message.includes('404') ||
          error.message.includes('not found') ||
          error.message.includes('is not supported')
        )) {
          continue; // Try next model
        }

        // For other errors (like quota), we might want to try other models too
        // but if it's clearly a model-not-found error, continue
        if (error instanceof Error && error.message.includes('models/')) {
          continue;
        }
      }
    }

    // All Gemini models failed, fallback to OpenAI with retry
    console.log('⚠️ All Gemini models failed, falling back to OpenAI...');

    // If Gemini failed due to quota, wait a bit before trying OpenAI
    if (lastError && (lastError.message.includes('429') || lastError.message.includes('quota') || lastError.message.includes('RESOURCE_EXHAUSTED'))) {
      console.log('⏳ Waiting 3 seconds before trying OpenAI fallback...');
      await delay(3000);
    }

    try {
      const openaiStory = await openaiService.generateCharacterStory(character.name, {
        height: character.height,
        mass: character.mass,
        hair_color: character.hair_color,
        skin_color: character.skin_color,
        eye_color: character.eye_color,
        gender: character.gender,
        birth_year: character.birth_year,
      });
      console.log('✅ Story generated successfully using OpenAI fallback');
      return openaiStory;
    } catch (openaiError) {
      console.error('❌ OpenAI fallback also failed:', openaiError);
      const openaiErrorMsg = openaiError instanceof Error ? openaiError.message : String(openaiError);

      // Provide helpful error messages based on the type of failure
      if (openaiErrorMsg.includes('quota') || openaiErrorMsg.includes('rate limit')) {
        throw new Error(`Both APIs have quota limits exceeded. Please wait 5-10 minutes before trying again. Free tier limits reset periodically. Check usage: Gemini (https://ai.google.dev/) and OpenAI (https://platform.openai.com/usage)`);
      }

      if (lastError) {
        if (lastError.message.includes('429') || lastError.message.includes('quota') || lastError.message.includes('RESOURCE_EXHAUSTED')) {
          throw new Error(`Both APIs have quota limits exceeded. Please wait 5-10 minutes before trying again. Free tier limits reset periodically.`);
        }
        throw new Error(`Failed to generate story with both Gemini and OpenAI. Gemini error: ${lastError.message.substring(0, 150)}. OpenAI error: ${openaiErrorMsg.substring(0, 150)}`);
      }
      throw new Error(`Failed to generate story. OpenAI fallback error: ${openaiErrorMsg}`);
    }
  }
}

export const geminiService = new GeminiService();
