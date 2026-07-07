import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // e.g. "ROLE_UPDATE", "PERMIT_SUSPENDED"
  collectionName: { type: String, required: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  previousState: { type: mongoose.Schema.Types.Map, of: mongoose.Schema.Types.Mixed },
  newState: { type: mongoose.Schema.Types.Map, of: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String, required: true }
}, { timestamps: true });

auditLogSchema.index({ actor: 1 });
auditLogSchema.index({ documentId: 1 });
auditLogSchema.index({ createdAt: 1 });

export default mongoose.model('AuditLog', auditLogSchema);
