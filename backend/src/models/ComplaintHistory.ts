import { Schema, model, Document } from 'mongoose';
import { complaint_status } from '../types/db';

export interface IComplaintHistory extends Document {
  complaintId: Schema.Types.ObjectId;
  fromStatus: complaint_status | null;
  toStatus: complaint_status;
  notes?: string;
  changedBy: Schema.Types.ObjectId | null;
  createdAt: Date;
}

const complaintHistorySchema = new Schema<IComplaintHistory>(
  {
    complaintId: { type: Schema.Types.ObjectId, ref: 'Complaint', required: true },
    fromStatus: {
      type: String,
      enum: ['Received', 'Assigned', 'In Progress', 'Resolved', 'Closed', null],
      default: null,
    },
    toStatus: {
      type: String,
      enum: ['Received', 'Assigned', 'In Progress', 'Resolved', 'Closed'],
      required: true,
    },
    notes: { type: String },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

complaintHistorySchema.index({ complaintId: 1 });

export const ComplaintHistory = model<IComplaintHistory>('ComplaintHistory', complaintHistorySchema);
