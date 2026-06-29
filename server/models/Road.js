import mongoose from 'mongoose';

const RoadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a road name'],
      trim: true,
    },
    ward: {
      type: String,
      required: [true, 'Please add ward information'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['Open', 'Closed', 'Diverted'],
      default: 'Open',
    },
    closureReason: {
      type: String,
      default: '',
    },
    closedByPermit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Permit',
      default: null,
    },
    geometry: {
      type: {
        type: String,
        enum: ['LineString'],
        default: 'LineString',
      },
      coordinates: {
        type: [[Number]], // Array of [longitude, latitude] coordinates
        required: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// GeoJSON index for path searches
RoadSchema.index({ geometry: '2dsphere' });

export default mongoose.model('Road', RoadSchema);
