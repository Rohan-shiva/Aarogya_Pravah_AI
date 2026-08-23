const { body, param } = require('express-validator');
const { Appointment } = require('../models/Appointment');
const { AIAnalysis } = require('../models/AIAnalysis');
const { MedicalImageAnalysis } = require('../models/MedicalImageAnalysis');
const { analyzePatientTriage } = require('../services/groqService');
const { updateAppointmentPriority } = require('../services/queueService');
const { processScreeningResult } = require('../services/imageAnalysisService');
const { recordAuditLog } = require('../services/auditService');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * @route   POST /api/ai/analyze-triage/:appointmentId
 * @desc    Manually trigger or re-run Groq AI clinical triage for an appointment
 * @access  Private (Staff, Doctor)
 */
const runGroqTriage = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId).populate('patient');
    if (!appointment) {
      return ApiResponse.notFound(res, 'Appointment not found');
    }

    const aiResult = await analyzePatientTriage({
      patientName: appointment.patient.name,
      age: appointment.patient.age,
      gender: appointment.patient.gender,
      department: appointment.department,
      symptoms: appointment.symptoms,
      symptomsDescription: appointment.symptomsDescription,
      possibleCondition: appointment.possibleCondition,
      reportedSeverity: appointment.reportedSeverity,
      staffSeverity: appointment.staffSeverity,
      isAccident: appointment.isAccident,
      accidentSeverity: appointment.accidentSeverity,
      medicalImageType: appointment.medicalImageType,
    });

    let aiRecord = await AIAnalysis.findOne({ appointment: appointment._id });
    if (!aiRecord) {
      aiRecord = new AIAnalysis({
        appointment: appointment._id,
        patient: appointment.patient._id,
        ...aiResult,
      });
    } else {
      Object.assign(aiRecord, aiResult);
      aiRecord.analyzedAt = new Date();
    }
    await aiRecord.save();

    // Recalculate priority if queue entry exists
    await updateAppointmentPriority(appointment._id);

    await recordAuditLog({
      user: req.user,
      action: 'GROQ_AI_TRIAGE_RUN',
      targetType: 'AI_ANALYSIS',
      targetId: aiRecord._id,
      details: { tokenNumber: appointment.tokenNumber, priorityRecommendation: aiRecord.priorityRecommendation },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return ApiResponse.success(res, 'Groq AI clinical triage completed', {
      aiAnalysis: aiRecord,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/ai/analysis/:appointmentId
 * @desc    Get Groq AI clinical analysis for an appointment
 * @access  Private (Staff, Doctor)
 */
const getGroqAnalysis = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;

    const aiAnalysis = await AIAnalysis.findOne({ appointment: appointmentId });
    if (!aiAnalysis) {
      return ApiResponse.notFound(res, 'No AI analysis found for this appointment');
    }

    return ApiResponse.success(res, 'AI analysis retrieved', { aiAnalysis });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/ai/image-analysis-result
 * @desc    Webhook/Service interface for external Python + PyTorch screening model
 * @access  Public (or API Key protected in production)
 */
const receiveImageAnalysisResult = async (req, res, next) => {
  try {
    const {
      appointmentId,
      tokenNumber,
      screeningStatus = 'NORMAL',
      imageScore = 0.0,
      possibleFindings = [],
      modelVersion = 'pytorch-med-screen-v1.0',
      confidenceSignal = 0.85,
      findingsDetails = {},
      imageUrl,
      publicId,
      assetId,
      timestamp,
    } = req.body;

    const result = await processScreeningResult({
      appointmentId,
      tokenNumber,
      screeningStatus,
      imageScore,
      possibleFindings,
      modelVersion,
      confidenceSignal,
      findingsDetails,
      imageUrl,
      publicId,
      assetId,
      timestamp,
    });

    await recordAuditLog({
      userName: 'PyTorch Screening Worker',
      userRole: 'SYSTEM',
      action: 'IMAGE_SCREENING_INGESTED',
      targetType: 'IMAGE_ANALYSIS',
      targetId: result.imageRecord._id,
      details: {
        tokenNumber: result.appointment.tokenNumber,
        screeningStatus,
        imageScore,
        newPriorityScore: result.updatedPriority?.priorityScore,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return ApiResponse.success(
      res,
      'Preliminary medical image screening signal processed and priority updated',
      {
        tokenNumber: result.appointment.tokenNumber,
        imageAnalysis: result.imageRecord,
        updatedPriority: result.updatedPriority,
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/ai/image-analysis/:appointmentId
 * @desc    Get medical image analysis record
 * @access  Private (Doctor, Staff)
 */
const getImageAnalysis = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;

    const imageAnalysis = await MedicalImageAnalysis.findOne({ appointment: appointmentId });
    if (!imageAnalysis) {
      return ApiResponse.notFound(res, 'No medical image analysis found for this appointment');
    }

    return ApiResponse.success(res, 'Medical image analysis retrieved', { imageAnalysis });
  } catch (error) {
    next(error);
  }
};

// Validation rules
const imageResultValidation = [
  body('imageScore').isFloat({ min: 0, max: 1 }).withMessage('imageScore must be a float between 0.0 and 1.0'),
  body('screeningStatus')
    .isIn(['NORMAL', 'MILD_FINDINGS', 'MODERATE_FINDINGS', 'CRITICAL_ABNORMALITY_DETECTED', 'INCONCLUSIVE'])
    .withMessage('Invalid screeningStatus'),
];

module.exports = {
  runGroqTriage,
  getGroqAnalysis,
  receiveImageAnalysisResult,
  getImageAnalysis,
  imageResultValidation,
};
