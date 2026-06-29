import { Schema, model, Document } from 'mongoose';
import { user_role, user_status } from '../types/db';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: user_role;
  status: user_status;
  department: Schema.Types.ObjectId | null;
  verificationToken?: string;
  resetToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['Super Admin', 'Nodal Officer', 'Department Admin', 'Department Engineer', 'Citizen', 'Read-only Auditor'],
      default: 'Citizen',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending_verification'],
      default: 'pending_verification',
    },
    department: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    verificationToken: { type: String },
    resetToken: { type: String },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
