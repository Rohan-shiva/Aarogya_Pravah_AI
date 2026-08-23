const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: {
      type: String,
    },
    userRole: {
      type: String,
      enum: ['STAFF', 'DOCTOR', 'SYSTEM', 'PATIENT'],
      default: 'SYSTEM',
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['APPOINTMENT', 'PATIENT', 'QUEUE', 'USER', 'CONSULTATION', 'AI_ANALYSIS', 'IMAGE_ANALYSIS'],
      required: true,
    },
    targetId: {
      type: String,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;
