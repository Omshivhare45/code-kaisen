import { Schema, model, Document } from 'mongoose';

export interface INotification extends Document {
  userId: Schema.Types.ObjectId | null; // Null means global/citizen broadcast
  title: string;
  message: string;
  channel: 'in-app' | 'email' | 'sms' | 'whatsapp';
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    title: { type: String, required: true },
    message: { type: String, required: true },
    channel: {
      type: String,
      enum: ['in-app', 'email', 'sms', 'whatsapp'],
      default: 'in-app',
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ userId: 1 });
notificationSchema.index({ isRead: 1 });

export const Notification = model<INotification>('Notification', notificationSchema);
