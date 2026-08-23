const mongoose = require('mongoose');

const screeningStatusEnum = [
  'NORMAL',
  'MILD_FINDINGS',
  'MODERATE_FINDINGS',
  'CRITICAL_ABNORMALITY_DETECTED',
  'INCONCLUSIVE',
];

const medicalImageAnalysisSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    screeningStatus: {
      type: String,
      enum: screeningStatusEnum,
      required: true,
      default: 'NORMAL',
    },
    imageScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1, // Normalized 0.0 to 1.0
    },
    possibleFindings: {
      type: [String],
      default: [],
    },
    modelVersion: {
      type: String,
      default: 'pytorch-med-screen-v1.0',
    },
    confidenceSignal: {
      type: Number,
      default: 0.85,
      min: 0,
      max: 1,
    },
    findingsDetails: {
      type: mongoose.Schema.Types.Mixed,
    },
    publicId: {
      type: String,
      trim: true,
    },
    assetId: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    disclaimer: {
      type: String,
      default: 'PRELIMINARY IMAGE SCREENING SIGNAL ONLY. This is an automated screening aid and does NOT constitute a radiological or medical diagnosis.',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const MedicalImageAnalysis = mongoose.model('MedicalImageAnalysis', medicalImageAnalysisSchema);
module.exports = {
  MedicalImageAnalysis,
  screeningStatusEnum,
};
