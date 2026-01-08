# Backend Setup Instructions

## Quick Start

1. **Create `.env` file** in the backend directory:
```env
GEMINI_API_KEY=AIzaSyAc2h_xhE89OSiADjF1jv7ShuPPzHgE-o8
PORT=3001
FRONTEND_URL=http://localhost:5173
```

2. **Install dependencies**:
```bash
cd backend
npm install
```

3. **Start the server**:
```bash
npm run dev
```

## MongoDB Setup (Optional)

MongoDB is optional - the app works without it, but images won't be cached.

### Option 1: Local MongoDB
1. Install MongoDB: https://www.mongodb.com/try/download/community
2. Start MongoDB: `mongod`
3. Add to `.env`: `MONGODB_URI=mongodb://localhost:27017/sw-universe`

### Option 2: MongoDB Atlas (Cloud - Free)
1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string
4. Add to `.env`: `MONGODB_URI=your_atlas_connection_string`

## Gemini API Endpoint Configuration

**Important**: The Imagen API endpoint format may need adjustment based on:
- Your Gemini API key's access level
- Current Google API documentation
- Available models in your region

If image generation fails, check:
1. The endpoint in `src/services/geminiService.ts`
2. Google's current Imagen API documentation: https://ai.google.dev/gemini-api/docs/imagen
3. Your API key has image generation permissions

The current implementation tries multiple endpoint formats automatically.

## Testing

1. Start the backend: `npm run dev`
2. Test health endpoint: `curl http://localhost:3001/health`
3. Test image generation from frontend (click "Generate Image" on character page)

## Troubleshooting

**"GEMINI_API_KEY is not set"**
- Create `.env` file with your API key

**"Image generation failed"**
- Check API key is valid
- Verify endpoint format in `geminiService.ts`
- Check Google's API documentation for current format
- Ensure your free tier includes image generation

**"MongoDB connection failed"**
- MongoDB is optional - app works without it
- If you want caching, install MongoDB or use Atlas
- Or remove MONGODB_URI from `.env` to disable caching
