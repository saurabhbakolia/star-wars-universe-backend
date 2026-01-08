import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { geminiService } from '../services/geminiService';
import { replicateService } from '../services/replicateService';

const router = Router();

// Zod schema for character name validation
const characterNameSchema = z.object({
  characterName: z.string().min(1, 'Character name is required'),
});

/**
 * POST /api/anime-sketch/generate
 * Generate an anime-style sketch image for a character
 */
router.post('/generate', async (req: Request, res: Response) => {
  console.log('🎨 [POST /generate] Anime sketch generation endpoint called');
  try {
    // Validate request body
    const { characterName } = characterNameSchema.parse(req.body);
    
    console.log(`🎨 Generating anime sketch for: ${characterName}`);

    // Step 1: Generate prompt using Gemini
    let prompt: string;
    try {
      prompt = await geminiService.generateAnimeSketchPrompt(characterName);
      console.log('✅ Prompt generated:', prompt.substring(0, 100) + '...');
    } catch (error) {
      console.error('❌ Error generating prompt:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate prompt',
      });
    }

    // Step 2: Generate image using Replicate
    let imageUrl: string;
    try {
      imageUrl = await replicateService.generateAnimeSketch(prompt);
      console.log('✅ Image generated successfully');
    } catch (error) {
      console.error('❌ Error generating image:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate image',
      });
    }

    res.json({
      success: true,
      imageUrl,
      prompt,
      characterName,
    });
  } catch (error) {
    console.error('Error in /api/anime-sketch/generate:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate anime sketch',
    });
  }
});

export default router;
