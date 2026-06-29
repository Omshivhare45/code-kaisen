import { Schema, model, Document } from 'mongoose';
import { permit_status } from '../types/db';

export interface IPermit extends Document {
  permitNumber: string;
  department: Schema.Types.ObjectId;
  roadName: string;
  ward: string;
  latitude: number;
  longitude: number;
  geometry: {
    type: 'LineString' | 'Polygon';
    coordinates: any;
  };
  centroid: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  purpose: string;
  startDate: Date;
  endDate: Date;
  depth: number;
  restorationPlan: string;
  attachments: string[];
  status: permit_status;
  conflictScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  recommendations?: string;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const permitSchema = new Schema<IPermit>(
  {
    permitNumber: { type: String, required: true, unique: true },
    department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    roadName: { type: String, required: true },
    ward: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    geometry: {
      type: {
        type: String,
        enum: ['LineString', 'Polygon'],
        required: true
      },
      coordinates: {
        type: Schema.Types.Mixed,
        required: true
      }
    },
    centroid: {
      type: {
        type: String,
        enum: ['Point'],
        required: true
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
    purpose: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    depth: { type: Number, required: true },
    restorationPlan: { type: String, required: true },
    attachments: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Completed'],
      default: 'Draft',
    },
    conflictScore: { type: Number, default: 0 },
    riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
    recommendations: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Geo-spatial indexing
permitSchema.index({ geometry: '2dsphere' });
permitSchema.index({ centroid: '2dsphere' });
permitSchema.index({ status: 1 });
permitSchema.index({ department: 1 });

export const Permit = model<IPermit>('Permit', permitSchema);
