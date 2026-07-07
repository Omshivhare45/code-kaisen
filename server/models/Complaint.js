import mongoose from 'mongoose';
import softDeletePlugin from '../plugins/softDelete.js';

const complaintSchema = new mongoose.Schema({
  complaintNumber: { type: String, required: true, unique: true },
  citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  complaintType: { type: String, required: true, enum: ['Unauthorized Digging', 'Road Damage', 'Water Leakage', 'Cable Exposure', 'Debris Accumulation', 'Other'] },
  description: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  ward: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward', required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  status: { type: String, enum: ['Received', 'Assigned', 'In Progress', 'Resolved', 'Rejected'], default: 'Received' },
  isSlaViolated: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

complaintSchema.index({ location: '2dsphere' });
complaintSchema.index({ status: 1 });
complaintSchema.index({ department: 1 });
complaintSchema.index({ isSlaViolated: 1 });
complaintSchema.index({ isDeleted: 1 });

complaintSchema.plugin(softDeletePlugin);

export default mongoose.model('Complaint', complaintSchema);
