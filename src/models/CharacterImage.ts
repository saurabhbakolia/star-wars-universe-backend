import mongoose, { Schema, Document } from 'mongoose';

export interface ICharacterImage extends Document {
  characterName: string;
  characterId: string;
  imageUrl: string;
  prompt: string;
  createdAt: Date;
  expiresAt?: Date;
}

const CharacterImageSchema = new Schema<ICharacterImage>({
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
  imageUrl: {
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

export const CharacterImage = mongoose.model<ICharacterImage>(
  'CharacterImage',
  CharacterImageSchema
);
