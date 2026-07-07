import mongoose from 'mongoose';
import softDeletePlugin from '../plugins/softDelete.js';

const permitSchema = new mongoose.Schema({
  permitNumber: { type: String, required: true, unique: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roadName: { type: String, required: true },
  ward: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward', required: true },
  location: {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  radius: { type: Number, required: true, min: 10, max: 1000 }, // Affected spatial zone in meters
  purpose: { type: String, required: true, minlength: 10 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  depth: { type: Number, required: true, min: 0.1 }, // In meters
  restorationPlan: { type: String, required: true },
  status: { type: String, required: true, enum: ['Pending', 'Approved', 'Active', 'Completed', 'Conflict', 'Rejected', 'Suspended'], default: 'Pending' },
  isJointExcavationSuggested: { type: Boolean, default: false },
  conflictingPermits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permit' }],
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

permitSchema.index({ location: '2dsphere' });
permitSchema.index({ status: 1 });
permitSchema.index({ startDate: 1, endDate: 1 });
permitSchema.index({ isDeleted: 1 });

permitSchema.plugin(softDeletePlugin);

export default mongoose.model('Permit', permitSchema);
