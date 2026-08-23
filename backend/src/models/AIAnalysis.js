const mongoose = require('mongoose');

const aiLevelsEnum = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const aiAnalysisSchema = new mongoose.Schema(
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
    urgencyLevel: {
      type: String,
      enum: aiLevelsEnum,
      required: true,
    },
    riskLevel: {
      type: String,
      enum: aiLevelsEnum,
      required: true,
    },
    riskFactors: {
      type: [String],
      default: [],
    },
    priorityRecommendation: {
      type: String,
      enum: aiLevelsEnum,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    suggestedVitalsToCheck: {
      type: [String],
      default: [],
    },
    modelName: {
      type: String,
      default: 'groq/llama-3.3-70b-versatile',
    },
    isAiFallback: {
      type: Boolean,
      default: false,
    },
    disclaimer: {
      type: String,
      default: 'PRELIMINARY DECISION SUPPORT ONLY. This AI analysis is an administrative triage aid and does NOT constitute a medical diagnosis or treatment plan.',
    },
    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    analyzedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const AIAnalysis = mongoose.model('AIAnalysis', aiAnalysisSchema);
module.exports = {
  AIAnalysis,
  aiLevelsEnum,
};
