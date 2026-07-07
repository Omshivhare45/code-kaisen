import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String },
  color: { type: String, required: true, default: '#3b82f6' }, // Hex color for mapping
  headOfDepartment: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true, match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email'] },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

departmentSchema.index({ isDeleted: 1 });

export default mongoose.model('Department', departmentSchema);
