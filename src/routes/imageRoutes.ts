import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { geminiService } from '../services/geminiService';
import { CharacterImage } from '../models/CharacterImage';
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
 * POST /api/images/generate
 * Generate an AI image for a character
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const characterData = characterDataSchema.parse(req.body);
    
    // Extract character ID from URL if provided
    const characterId = characterData.url 
      ? extractIdFromUrl(characterData.url) 
      : characterData.name.toLowerCase().replace(/\s+/g, '-');

    // Check if image already exists in cache (only if MongoDB is available)
    let cachedImage = null;
    try {
      cachedImage = await CharacterImage.findOne({ characterId });
      if (cachedImage) {
        console.log(`📦 Returning cached image for ${characterData.name}`);
        return res.json({
          success: true,
          imageUrl: cachedImage.imageUrl,
          cached: true,
          characterName: cachedImage.characterName,
        });
      }
    } catch (dbError) {
      // MongoDB not available or error - continue without cache
      console.log('MongoDB not available, skipping cache check');
    }

    // Generate new image
    console.log(`🎨 Generating new image for ${characterData.name}...`);
    const imageUrl = await geminiService.generateCharacterImage(characterData);
    
    // Create prompt for caching (we'll extract it from the service)
    const prompt = `AI-generated animated image of ${characterData.name}, a Star Wars character with ${characterData.hair_color} hair, ${characterData.skin_color} skin, and ${characterData.eye_color} eyes.`;

    // Cache the image in database (only if MongoDB is available)
    try {
      const characterImage = new CharacterImage({
        characterName: characterData.name,
        characterId,
        imageUrl,
        prompt,
      });
      await characterImage.save();
      console.log(`✅ Image generated and cached for ${characterData.name}`);
    } catch (dbError) {
      // MongoDB not available - continue without caching
      console.log('MongoDB not available, image generated but not cached');
    }

    res.json({
      success: true,
      imageUrl,
      cached: false,
      characterName: characterData.name,
    });
  } catch (error) {
    console.error('Error in /api/images/generate:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid character data',
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate image',
    });
  }
});

/**
 * GET /api/images/:characterId
 * Get cached image for a character
 */
router.get('/:characterId', async (req: Request, res: Response) => {
  try {
    const { characterId } = req.params;
    let cachedImage = null;
    
    try {
      cachedImage = await CharacterImage.findOne({ characterId });
    } catch (dbError) {
      // MongoDB not available
      return res.status(404).json({
        success: false,
        error: 'Caching not available - MongoDB not configured',
      });
    }

    if (!cachedImage) {
      return res.status(404).json({
        success: false,
        error: 'Image not found for this character',
      });
    }

    res.json({
      success: true,
      imageUrl: cachedImage.imageUrl,
      characterName: cachedImage.characterName,
      createdAt: cachedImage.createdAt,
    });
  } catch (error) {
    console.error('Error in GET /api/images/:characterId:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve image',
    });
  }
});

export default router;
