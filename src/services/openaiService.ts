import OpenAI from 'openai';

let openai: OpenAI | null = null;
let cachedOpenAIKey: string | null = null;

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getOpenAI(): OpenAI {
  const API_KEY = process.env.OPENAI_API_KEY;
  if (!API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  
  // Reinitialize if API key changed or not yet initialized
  if (!openai || cachedOpenAIKey !== API_KEY) {
    console.log('🔑 Initializing OpenAI API with new key...');
    openai = new OpenAI({ apiKey: API_KEY });
    cachedOpenAIKey = API_KEY;
  }
  return openai;
}

export class OpenAIService {
  /**
   * Generate text using OpenAI API
   * Falls back to this when Gemini fails
   */
  async generateText(prompt: string, model: string = 'gpt-3.5-turbo', retryCount: number = 0): Promise<string> {
    const maxRetries = 1; // Retry once
    
    try {
      const client = getOpenAI();
      
      console.log('🤖 Generating text with OpenAI...');
      console.log('📝 Prompt:', prompt.substring(0, 100) + '...');
      
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const generatedText = response.choices[0]?.message?.content;
      
      if (!generatedText) {
        throw new Error('OpenAI API returned empty response');
      }

      console.log('✅ Text generated successfully with OpenAI');
      return generatedText.trim();
    } catch (error) {
      console.error('❌ Error generating text with OpenAI:', error);
      
      // Retry on quota errors with delay
      if (error instanceof Error && retryCount < maxRetries && (
        error.message.includes('quota') || 
        error.message.includes('rate limit') ||
        error.message.includes('429')
      )) {
        const waitTime = 5000 * (retryCount + 1); // 5s, 10s
        console.log(`⏳ OpenAI quota error, waiting ${waitTime/1000}s and retrying (attempt ${retryCount + 1}/${maxRetries})...`);
        await delay(waitTime);
        return this.generateText(prompt, model, retryCount + 1);
      }
      
      if (error instanceof Error) {
        if (error.message.includes('API key') || error.message.includes('authentication')) {
          throw new Error('OpenAI API authentication failed. Please check your OPENAI_API_KEY.');
        }
        if (error.message.includes('quota') || error.message.includes('limit')) {
          throw new Error('OpenAI API quota exceeded. Please wait 5-10 minutes and try again.');
        }
        throw new Error(`Failed to generate text with OpenAI: ${error.message}`);
      }
      throw new Error('Failed to generate text with OpenAI: Unknown error');
    }
  }

  /**
   * Generate a character story using OpenAI
   * Fallback method when Gemini fails
   */
  async generateCharacterStory(characterName: string, characterData: {
    height: string;
    mass: string;
    hair_color: string;
    skin_color: string;
    eye_color: string;
    gender: string;
    birth_year: string;
  }): Promise<string> {
    const prompt = `Write a short, engaging story (300-500 words) about ${characterName}, a Star Wars character.

Character details:
- Name: ${characterName}
- Height: ${characterData.height} cm
- Mass: ${characterData.mass} kg
- Hair color: ${characterData.hair_color}
- Skin color: ${characterData.skin_color}
- Eye color: ${characterData.eye_color}
- Gender: ${characterData.gender}
- Birth year: ${characterData.birth_year}

Write an imaginative, Star Wars-themed short story that brings this character to life. 
The story should be engaging, well-written, and capture the essence of the Star Wars universe.
Make it dramatic, adventurous, and true to the Star Wars style.`;

    return this.generateText(prompt, 'gpt-3.5-turbo');
  }

  /**
   * Generate an anime sketch prompt using OpenAI
   * Fallback method when Gemini fails
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

    return this.generateText(prompt, 'gpt-3.5-turbo');
  }
}

export const openaiService = new OpenAIService();
