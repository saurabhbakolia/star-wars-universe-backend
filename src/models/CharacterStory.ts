import mongoose, { Schema, Document } from 'mongoose';

export interface ICharacterStory extends Document {
  characterName: string;
  characterId: string;
  story: string;
  prompt: string;
  createdAt: Date;
  expiresAt?: Date;
}

const CharacterStorySchema = new Schema<ICharacterStory>({
  characterName: {
    type: String,
    required: true,
    index: true,
  },
  characterId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  story: {
    type: String,
    required: true,
  },
  prompt: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: { expires: '30d' }, // Auto-delete after 30 days
  },
  expiresAt: {
    type: Date,
    index: { expires: 0 },
  },
});

export const CharacterStory = mongoose.model<ICharacterStory>(
  'CharacterStory',
  CharacterStorySchema
);
