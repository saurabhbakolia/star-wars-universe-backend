import Replicate from 'replicate';

let replicate: Replicate | null = null;

function getReplicate(): Replicate {
  if (!replicate) {
    const API_TOKEN = process.env.REPLICATE_API_TOKEN;
    if (!API_TOKEN) {
      throw new Error('REPLICATE_API_TOKEN is not set in environment variables');
    }
    replicate = new Replicate({ auth: API_TOKEN });
  }
  return replicate;
}

export class ReplicateService {
  /**
   * Generate an anime-style sketch image using Replicate API
   * Model: andite/anything-v5
   */
  async generateAnimeSketch(prompt: string): Promise<string> {
    try {
      const replicate = getReplicate();
      
      console.log('🎨 Generating anime sketch with Replicate...');
      console.log('📝 Prompt:', prompt.substring(0, 100) + '...');
      
      const output = await replicate.run(
        'andite/anything-v5:latest',
        {
          input: {
            prompt: `${prompt}, anime pencil sketch, clean line-art, manga style, high detail`,
            negative_prompt: 'blurry, low quality, extra limbs, distorted face',
          }
        }
      ) as string | string[];

      if (!output) {
        throw new Error('Replicate API returned empty output');
      }

      const imageUrl = Array.isArray(output) ? (output.length > 0 ? output[0] : null) : output;
      
      if (!imageUrl) {
        throw new Error('Replicate API returned empty image URL');
      }
      
      if (typeof imageUrl !== 'string') {
        throw new Error('Invalid image URL format from Replicate API');
      }

      console.log('✅ Anime sketch generated successfully');
      return imageUrl;
    } catch (error) {
      console.error('❌ Error generating anime sketch:', error);
      if (error instanceof Error) {
        if (error.message.includes('API token') || error.message.includes('authentication')) {
          throw new Error('Replicate API authentication failed. Please check your REPLICATE_API_TOKEN.');
        }
        if (error.message.includes('quota') || error.message.includes('limit')) {
          throw new Error('Replicate API quota exceeded. Please try again later.');
        }
        throw new Error(`Failed to generate anime sketch: ${error.message}`);
      }
      throw new Error('Failed to generate anime sketch: Unknown error');
    }
  }
}

export const replicateService = new ReplicateService();
