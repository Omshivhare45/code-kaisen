import { Schema, model, Document } from 'mongoose';
import { complaint_status, complaint_type } from '../types/db';

export interface IComplaint extends Document {
  ticketNumber: string;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  complaintType: complaint_type;
  description: string;
  roadName: string;
  latitude: number;
  longitude: number;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  status: complaint_status;
  assignedDepartment: Schema.Types.ObjectId | null;
  photoUrl?: string;
  rating?: number;
  feedback?: string;
  slaDeadline: Date;
  isEscalated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const complaintSchema = new Schema<IComplaint>(
  {
    ticketNumber: { type: String, required: true, unique: true },
    reporterName: { type: String },
    reporterEmail: { type: String, lowercase: true, trim: true },
    reporterPhone: { type: String },
    complaintType: {
      type: String,
      enum: ['Pothole', 'Dust', 'Blockage', 'Unsafe trench', 'Road damage', 'Illegal digging'],
      required: true,
    },
    description: { type: String, required: true },
    roadName: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    geometry: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    status: {
      type: String,
      enum: ['Received', 'Assigned', 'In Progress', 'Resolved', 'Closed'],
      default: 'Received',
    },
    assignedDepartment: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    photoUrl: { type: String },
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String },
    slaDeadline: { type: Date, required: true },
    isEscalated: { type: Boolean, default: false }, // Wait, in TS we use boolean, not capitalized
  },
  { timestamps: true }
);

// Geo-spatial index on the point location
complaintSchema.index({ geometry: '2dsphere' });
complaintSchema.index({ status: 1 });
complaintSchema.index({ assignedDepartment: 1 });
complaintSchema.index({ ticketNumber: 1 });

export const Complaint = model<IComplaint>('Complaint', complaintSchema);
