import { Schema, model, Document } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  slug: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    color: { type: String, default: '#3B82F6' },
  },
  { timestamps: true }
);

export const Department = model<IDepartment>('Department', departmentSchema);
