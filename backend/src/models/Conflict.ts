import { Schema, model, Document } from 'mongoose';

export interface IConflict extends Document {
  permitId: Schema.Types.ObjectId;
  conflictingPermitId: Schema.Types.ObjectId | null;
  conflictType: 'Spatial Proximity' | 'Schedule Overlap' | 'Recently Resurfaced Road' | 'Upcoming Project';
  description: string;
  createdAt: Date;
}

const conflictSchema = new Schema<IConflict>(
  {
    permitId: { type: Schema.Types.ObjectId, ref: 'Permit', required: true },
    conflictingPermitId: { type: Schema.Types.ObjectId, ref: 'Permit', default: null },
    conflictType: {
      type: String,
      enum: ['Spatial Proximity', 'Schedule Overlap', 'Recently Resurfaced Road', 'Upcoming Project'],
      required: true,
    },
    description: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

conflictSchema.index({ permitId: 1 });
conflictSchema.index({ conflictingPermitId: 1 });

export const Conflict = model<IConflict>('Conflict', conflictSchema);
