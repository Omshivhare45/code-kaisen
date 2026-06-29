import { Schema, model, Document } from 'mongoose';

export interface IAuditLog extends Document {
  userId: Schema.Types.ObjectId | null;
  action: string;
  entityType: string;
  entityId?: Schema.Types.ObjectId;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ action: 1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
