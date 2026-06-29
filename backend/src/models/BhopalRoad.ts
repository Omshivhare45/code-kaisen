import { Schema, model, Document } from 'mongoose';

export interface IBhopalRoad extends Document {
  name: string;
  roadType: string;
  geometry: {
    type: 'LineString';
    coordinates: number[][];
  };
  lastResurfacedAt?: Date;
}

const bhopalRoadSchema = new Schema<IBhopalRoad>({
  name: { type: String, required: true },
  roadType: { type: String, default: 'Local' },
  geometry: {
    type: {
      type: String,
      enum: ['LineString'],
      required: true
    },
    coordinates: {
      type: [[Number]], // Array of [longitude, latitude]
      required: true
    }
  },
  lastResurfacedAt: { type: Date }
});

// Spatial indexing
bhopalRoadSchema.index({ geometry: '2dsphere' });
bhopalRoadSchema.index({ name: 1 });

export const BhopalRoad = model<IBhopalRoad>('BhopalRoad', bhopalRoadSchema);
