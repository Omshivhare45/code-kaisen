import mongoose from 'mongoose';

const ComplaintSchema = new mongoose.Schema(
  {
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    photoUrl: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
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
    ward: {
      type: String,
      required: [true, 'Please add ward'],
    },
    complaintType: {
      type: String,
      required: [true, 'Please select a complaint type'],
      enum: ['Road Digging', 'Pothole', 'Water Leakage', 'Cable Damage', 'Open Trench', 'Unauthorized Digging', 'Other'],
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true, // Assign automatically based on type or triage rules
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Received', 'Assigned', 'In Progress', 'Resolved'],
      default: 'Received',
    },
    statusTimeline: [
      {
        status: {
          type: String,
          enum: ['Received', 'Assigned', 'In Progress', 'Resolved'],
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
        remarks: {
          type: String,
          default: '',
        },
      },
    ],
    rating: {
      score: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: {
        type: String,
        default: '',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Create index on location for geographic searches
ComplaintSchema.index({ location: '2dsphere' });

export default mongoose.model('Complaint', ComplaintSchema);
