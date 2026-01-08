# Star Wars Universe Backend API

Backend API for generating AI images of Star Wars characters using Google's Gemini API.

## 🚀 Features

- **AI Image Generation**: Uses Gemini Imagen API to generate animated character images
- **Image Caching**: MongoDB integration for caching generated images (optional)
- **RESTful API**: Express.js server with TypeScript
- **Error Handling**: Comprehensive error handling and validation

## 📋 Prerequisites

- Node.js 20+ 
- MongoDB (optional - for image caching)
- Gemini API Key (free tier available)

## 🛠️ Setup

1. **Install Dependencies**:
```bash
npm install
```

2. **Environment Variables**:
Create a `.env` file in the backend directory:
```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Optional
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/sw-universe
FRONTEND_URL=http://localhost:5173
```

3. **Start MongoDB** (if using caching):
```bash
# Using MongoDB locally
mongod

# Or use MongoDB Atlas (cloud)
# Just update MONGODB_URI in .env
```

4. **Start Development Server**:
```bash
npm run dev
```

The server will start on `http://localhost:3001`

## 📡 API Endpoints

### POST `/api/images/generate`
Generate an AI image for a character.

**Request Body**:
```json
{
  "name": "Luke Skywalker",
  "height": "172",
  "mass": "77",
  "hair_color": "blond",
  "skin_color": "fair",
  "eye_color": "blue",
  "gender": "male",
  "birth_year": "19BBY",
  "url": "https://swapi.info/api/people/1/" // optional
}
```

**Response**:
```json
{
  "success": true,
  "imageUrl": "data:image/png;base64,...",
  "cached": false,
  "characterName": "Luke Skywalker"
}
```

### GET `/api/images/:characterId`
Get a cached image for a character.

**Response**:
```json
{
  "success": true,
  "imageUrl": "data:image/png;base64,...",
  "characterName": "Luke Skywalker",
  "createdAt": "2024-01-09T00:00:00.000Z"
}
```

### GET `/health`
Health check endpoint.

## 🔧 Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests

## 📝 Notes

- Images are automatically cached in MongoDB (if configured) for 30 days
- Without MongoDB, images will still generate but won't be cached
- The Gemini API free tier has rate limits - consider implementing request throttling for production

## 🐛 Troubleshooting

**Error: GEMINI_API_KEY is not set**
- Make sure you have a `.env` file with your Gemini API key

**Error: MongoDB connection failed**
- Check if MongoDB is running
- Verify MONGODB_URI in .env
- If you don't need caching, you can remove MONGODB_URI - the app will work without it

**Error: Image generation failed**
- Check your Gemini API key is valid
- Verify you have access to Imagen models
- Check API rate limits
# star-wars-universe-backend
