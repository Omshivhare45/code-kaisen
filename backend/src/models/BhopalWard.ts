import { Schema, model, Document } from 'mongoose';

export interface IBhopalWard extends Document {
  name: string;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

const bhopalWardSchema = new Schema<IBhopalWard>({
  name: { type: String, required: true, unique: true },
  geometry: {
    type: {
      type: String,
      enum: ['Polygon'],
      required: true
    },
    coordinates: {
      type: [[[Number]]], // Array of arrays of [longitude, latitude]
      required: true
    }
  }
});

// Spatial indexing
bhopalWardSchema.index({ geometry: '2dsphere' });

export const BhopalWard = model<IBhopalWard>('BhopalWard', bhopalWardSchema);
