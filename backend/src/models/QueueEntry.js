const mongoose = require('mongoose');

const queueStatusEnum = ['WAITING', 'IN_CONSULTATION', 'PENDING', 'COMPLETED', 'CANCELLED'];
const priorityLevelEnum = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const queueEntrySchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    department: {
      type: String,
      required: true,
      index: true,
    },
    priorityScore: {
      type: Number,
      default: 0,
      index: true,
    },
    priorityLevel: {
      type: String,
      enum: priorityLevelEnum,
      default: 'MEDIUM',
      index: true,
    },
    queuePosition: {
      type: Number,
      default: 0,
    },
    estimatedWaitMinutes: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: queueStatusEnum,
      default: 'WAITING',
      index: true,
    },
    isPending: {
      type: Boolean,
      default: false,
      index: true,
    },
    pendingDetails: {
      heldByDoctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reason: {
        type: String,
        trim: true,
      },
      category: {
        type: String,
        enum: ['LAB_RESULTS', 'XRAY_SCAN', 'SPECIALIST_REVIEW', 'VITALS_STABILIZATION', 'PATIENT_UNAVAILABLE', 'OTHER'],
        default: 'OTHER',
      },
      notes: {
        type: String,
        trim: true,
      },
      heldAt: {
        type: Date,
      },
      resumedAt: {
        type: Date,
      },
    },
    scoreBreakdown: {
      clinicalSeverityPoints: { type: Number, default: 0 },
      accidentPoints: { type: Number, default: 0 },
      aiUrgencyPoints: { type: Number, default: 0 },
      aiRiskPoints: { type: Number, default: 0 },
      imageScreeningPoints: { type: Number, default: 0 },
      agingPoints: { type: Number, default: 0 },
      pendingReturnBoostPoints: { type: Number, default: 0 },
      totalScore: { type: Number, default: 0 },
      factorsUsed: [String],
    },
    checkInTime: {
      type: Date,
      default: Date.now,
    },
    consultationStartTime: {
      type: Date,
    },
    consultationEndTime: {
      type: Date,
    },
    assignedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastPriorityUpdate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast priority sorting inside a department
queueEntrySchema.index({ department: 1, status: 1, priorityScore: -1, checkInTime: 1 });

const QueueEntry = mongoose.model('QueueEntry', queueEntrySchema);
module.exports = {
  QueueEntry,
  queueStatusEnum,
  priorityLevelEnum,
};
