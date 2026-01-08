import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { geminiService } from '../services/geminiService';
import { CharacterStory } from '../models/CharacterStory';
import { extractIdFromUrl } from '../utils/helpers';

const router = Router();

// Zod schema for character data validation
const characterDataSchema = z.object({
  name: z.string(),
  height: z.string(),
  mass: z.string(),
  hair_color: z.string(),
  skin_color: z.string(),
  eye_color: z.string(),
  gender: z.string(),
  birth_year: z.string(),
  url: z.string().url().optional(),
});

/**
 * POST /api/stories/generate
 * Generate an AI story for a character
 */
router.post('/generate', async (req: Request, res: Response) => {
  console.log('📖 [POST /generate] Story generation endpoint called');
  console.log('📖 [POST /generate] Character:', req.body?.name);
  try {
    // Validate request body
    const characterData = characterDataSchema.parse(req.body);
    
    // Extract character ID from URL if provided
    const characterId = characterData.url 
      ? extractIdFromUrl(characterData.url) 
      : characterData.name.toLowerCase().replace(/\s+/g, '-');

    // Check if story already exists in cache (only if MongoDB is available)
    let cachedStory = null;
    try {
      cachedStory = await CharacterStory.findOne({ characterId });
      if (cachedStory) {
        console.log(`📦 Returning cached story for ${characterData.name}`);
        return res.json({
          success: true,
          story: cachedStory.story,
          cached: true,
          characterName: cachedStory.characterName,
        });
      }
    } catch (dbError) {
      // MongoDB not available or error - continue without cache
      console.log('MongoDB not available, skipping cache check');
    }

    // Generate new story
    console.log(`📖 Generating new story for ${characterData.name}...`);
    const story = await geminiService.generateCharacterStory(characterData);
    
    // Create prompt for caching
    const prompt = `Short story about ${characterData.name}, a Star Wars character with ${characterData.hair_color} hair, ${characterData.skin_color} skin, and ${characterData.eye_color} eyes.`;

    // Cache the story in database (only if MongoDB is available)
    try {
      const characterStory = new CharacterStory({
        characterName: characterData.name,
        characterId,
        story,
        prompt,
      });
      await characterStory.save();
      console.log(`✅ Story generated and cached for ${characterData.name}`);
    } catch (dbError) {
      // MongoDB not available - continue without caching
      console.log('MongoDB not available, story generated but not cached');
    }

    res.json({
      success: true,
      story,
      cached: false,
      characterName: characterData.name,
    });
  } catch (error) {
    console.error('Error in /api/stories/generate:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid character data',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate story',
    });
  }
});

/**
 * GET /api/stories/:characterId
 * Get cached story for a character
 * IMPORTANT: This endpoint ONLY returns cached stories from the database.
 * It NEVER generates new stories. If no cached story exists, it returns 404.
 * Story generation must be done via POST /api/stories/generate
 */
router.get('/:characterId', async (req: Request, res: Response) => {
  console.log('📦 [GET /:characterId] Fetching cached story for:', req.params.characterId);
  try {
    const { characterId } = req.params;
    
    // Prevent this route from matching /generate
    if (characterId === 'generate') {
      return res.status(404).json({
        success: false,
        error: 'Use POST /api/stories/generate to generate stories',
      });
    }
    
    let cachedStory = null;
    
    try {
      // ONLY look for cached stories - NEVER generate new ones
      cachedStory = await CharacterStory.findOne({ characterId });
    } catch (dbError) {
      // MongoDB not available
      return res.status(404).json({
        success: false,
        error: 'Caching not available - MongoDB not configured',
      });
    }

    // If no cached story exists, return 404 - do NOT generate
    if (!cachedStory) {
      console.log('📦 [GET /:characterId] No cached story found, returning 404');
      return res.status(404).json({
        success: false,
        error: 'Story not found for this character',
      });
    }
    
    console.log('📦 [GET /:characterId] Returning cached story');

    // Return the cached story
    res.json({
      success: true,
      story: cachedStory.story,
      characterName: cachedStory.characterName,
      cached: true, // Explicitly mark as cached
      createdAt: cachedStory.createdAt,
    });
  } catch (error) {
    console.error('Error in GET /api/stories/:characterId:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve story',
    });
  }
});

export default router;
