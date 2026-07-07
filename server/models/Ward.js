import mongoose from 'mongoose';

const wardSchema = new mongoose.Schema({
  zone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', required: true },
  name: { type: String, required: true, trim: true },
  number: { type: Number, required: true, unique: true },
  boundary: {
    type: { type: String, enum: ['Polygon'], required: true, default: 'Polygon' },
    coordinates: { type: [[[Number]]], required: true }
  },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

wardSchema.index({ boundary: '2dsphere' });
wardSchema.index({ zone: 1 });
wardSchema.index({ isDeleted: 1 });

export default mongoose.model('Ward', wardSchema);
