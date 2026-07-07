import mongoose from 'mongoose';

const zoneSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  boundary: {
    type: { type: String, enum: ['Polygon'], required: true, default: 'Polygon' },
    coordinates: { type: [[[Number]]], required: true } // [[[lon, lat], [lon, lat], ...]]
  },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

zoneSchema.index({ boundary: '2dsphere' });
zoneSchema.index({ isDeleted: 1 });

export default mongoose.model('Zone', zoneSchema);
