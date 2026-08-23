const mongoose = require('mongoose');

const appointmentStatusEnum = [
  'PENDING_STAFF_VERIFICATION',
  'VERIFIED',
  'REQUIRES_CLARIFICATION',
  'REJECTED',
  'WAITING',
  'IN_CONSULTATION',
  'PENDING',
  'COMPLETED',
  'CANCELLED',
];

const severityEnum = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const accidentSeverityEnum = ['NONE', 'EASY', 'MEDIUM', 'HIGH'];
const medicalImageTypeEnum = ['XRAY', 'X-RAY', 'CT_SCAN', 'CT-SCAN', 'MRI', 'PHOTO', 'OTHER', 'NONE'];
const medicalImageStatusEnum = [
  'UPLOADING',
  'UPLOADED',
  'ANALYSIS_PENDING',
  'ANALYZING',
  'ANALYZED',
  'ANALYSIS_FAILED',
];

const appointmentSchema = new mongoose.Schema(
  {
    tokenNumber: {
      type: String,
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
      required: [true, 'Department is required'],
      default: 'General Medicine',
      trim: true,
    },
    possibleCondition: {
      type: String,
      trim: true,
    },
    symptoms: {
      type: [String],
      required: [true, 'At least one symptom is required'],
    },
    symptomsDescription: {
      type: String,
      trim: true,
    },
    reportedSeverity: {
      type: String,
      enum: severityEnum,
      default: 'MEDIUM',
    },
    staffSeverity: {
      type: String,
      enum: severityEnum,
    },
    isAccident: {
      type: Boolean,
      default: false,
    },
    accidentSeverity: {
      type: String,
      enum: accidentSeverityEnum,
      default: 'NONE',
    },
    medicalImage: {
      provider: {
        type: String,
        default: 'cloudinary',
      },
      assetId: {
        type: String,
      },
      publicId: {
        type: String,
      },
      secureUrl: {
        type: String,
      },
      resourceType: {
        type: String,
        default: 'image',
      },
      format: {
        type: String,
      },
      bytes: {
        type: Number,
      },
      uploadedAt: {
        type: Date,
      },
      status: {
        type: String,
        enum: medicalImageStatusEnum,
        default: 'UPLOADED',
      },
      analysisStartedAt: {
        type: Date,
      },
      analysisCompletedAt: {
        type: Date,
      },
      analysisError: {
        type: String,
      },
    },
    medicalImageUrl: {
      type: String,
      trim: true,
    },
    medicalImageType: {
      type: String,
      enum: medicalImageTypeEnum,
      default: 'NONE',
    },
    appointmentDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: appointmentStatusEnum,
      default: 'PENDING_STAFF_VERIFICATION',
      index: true,
    },
    initialEstimatedWaitMinutes: {
      type: Number,
      default: 15,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verificationNotes: {
      type: String,
      trim: true,
    },
    clarificationReason: {
      type: String,
      trim: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    assignedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    queueEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QueueEntry',
    },
  },
  {
    timestamps: true,
  }
);

// Helpful index for department and status queries
appointmentSchema.index({ department: 1, status: 1 });
appointmentSchema.index({ createdAt: -1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);
module.exports = {
  Appointment,
  appointmentStatusEnum,
  severityEnum,
  accidentSeverityEnum,
  medicalImageTypeEnum,
  medicalImageStatusEnum,
};
