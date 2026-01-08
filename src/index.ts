// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from backend directory
dotenv.config({ path: resolve(__dirname, '../.env') });

// Log API key status (without exposing full keys)
console.log('🔑 Environment variables loaded:');
console.log('   GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? `✅ Set (${process.env.GEMINI_API_KEY.substring(0, 10)}...)` : '❌ Not set');
console.log('   OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `✅ Set (${process.env.OPENAI_API_KEY.substring(0, 10)}...)` : '❌ Not set');

import express, { Express } from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database';
import imageRoutes from './routes/imageRoutes';
import storyRoutes from './routes/storyRoutes';
import animeSketchRoutes from './routes/animeSketchRoutes';

const app: Express = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// API Routes
app.use('/api/images', imageRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/anime-sketch', animeSketchRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
async function startServer() {
  try {
    // Connect to MongoDB (optional - will work without it, just won't cache)
    if (process.env.MONGODB_URI) {
      await connectDatabase();
    } else {
      console.log('⚠️  MongoDB URI not set - caching disabled');
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 Image API endpoint: http://localhost:${PORT}/api/images`);
      console.log(`📖 Story API endpoint: http://localhost:${PORT}/api/stories`);
      console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
