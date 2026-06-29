import mongoose from 'mongoose';

const PermitSchema = new mongoose.Schema(
  {
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    roadName: {
      type: String,
      required: [true, 'Please add the road name'],
      trim: true,
    },
    ward: {
      type: String,
      required: [true, 'Please add the ward'],
      trim: true,
    },
    latitude: {
      type: Number,
      required: [true, 'Please add latitude'],
    },
    longitude: {
      type: Number,
      required: [true, 'Please add longitude'],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    radius: {
      type: Number,
      required: [true, 'Please add radius (meters)'],
      default: 50, // default conflict search radius in meters
    },
    purpose: {
      type: String,
      required: [true, 'Please add the purpose of digging'],
    },
    startDate: {
      type: Date,
      required: [true, 'Please add start date'],
    },
    endDate: {
      type: Date,
      required: [true, 'Please add end date'],
    },
    depth: {
      type: Number,
      required: [true, 'Please add digging depth (meters)'],
    },
    restorationPlan: {
      type: String,
      required: [true, 'Please add restoration plan details'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Active', 'Completed', 'Conflict'],
      default: 'Pending',
    },
    conflictingPermits: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permit',
      },
    ],
    isJointExcavationSuggested: {
      type: Boolean,
      default: false,
    },
    jointExcavationAgreedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
      },
    ],
    applicantName: {
      type: String,
      required: true,
    },
    applicantPhone: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create 2dsphere index for spatial queries
PermitSchema.index({ location: '2dsphere' });

export default mongoose.model('Permit', PermitSchema);
