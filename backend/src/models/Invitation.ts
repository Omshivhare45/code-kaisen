import { Schema, model, Document } from 'mongoose';
import { user_role } from '../types/db';

export interface IInvitation extends Document {
  email: string;
  department: Schema.Types.ObjectId;
  role: user_role;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

const invitationSchema = new Schema<IInvitation>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    role: {
      type: String,
      enum: ['Super Admin', 'Nodal Officer', 'Department Admin', 'Department Engineer', 'Citizen', 'Read-only Auditor'],
      required: true,
    },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Invitation = model<IInvitation>('Invitation', invitationSchema);
