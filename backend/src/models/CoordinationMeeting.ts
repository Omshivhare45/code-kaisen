import { Schema, model, Document } from 'mongoose';

export interface IParticipant {
  name: string;
  email: string;
  department: string;
}

export interface ICoordinationMeeting extends Document {
  permitId: Schema.Types.ObjectId;
  meetingDate: Date;
  notes: string;
  decisions?: string;
  participants: IParticipant[];
  createdAt: Date;
}

const participantSchema = new Schema<IParticipant>({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  department: { type: String, required: true },
});

const coordinationMeetingSchema = new Schema<ICoordinationMeeting>(
  {
    permitId: { type: Schema.Types.ObjectId, ref: 'Permit', required: true },
    meetingDate: { type: Date, required: true },
    notes: { type: String, required: true },
    decisions: { type: String },
    participants: { type: [participantSchema], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

coordinationMeetingSchema.index({ permitId: 1 });

export const CoordinationMeeting = model<ICoordinationMeeting>('CoordinationMeeting', coordinationMeetingSchema);
