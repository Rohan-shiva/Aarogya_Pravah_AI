const { Appointment } = require('../models/Appointment');
const { MedicalImageAnalysis } = require('../models/MedicalImageAnalysis');
const { updateAppointmentPriority } = require('../services/queueService');
const { socketEmitter } = require('../sockets/socketEmitter');
const logger = require('../utils/logger');

const mlServiceUrl = process.env.ML_SERVICE_URL || process.env.PYTORCH_SERVICE_URL || 'http://localhost:8000';
const mlTimeoutMs = parseInt(process.env.ML_SERVICE_TIMEOUT || process.env.PYTORCH_SERVICE_TIMEOUT, 10) || 10000;

/**
 * Process a screening result payload from the ML service (or webhook),
 * persist the screening metadata in MongoDB, recalculate queue priority,
 * and broadcast real-time updates to staff and doctors.
 */
const processScreeningResult = async ({
  appointmentId,
  tokenNumber,
  screeningStatus = 'NORMAL',
  imageScore = 0.0,
  possibleFindings = [],
  modelVersion = 'densenet121-tf-v1.0',
  confidenceSignal = 0.85,
  findingsDetails = {},
  imageUrl,
  publicId,
  assetId,
  timestamp,
}) => {
  let appointment;
  if (appointmentId) {
    appointment = await Appointment.findById(appointmentId).populate('patient');
  } else if (tokenNumber) {
    appointment = await Appointment.findOne({ tokenNumber }).populate('patient');
  }

  if (!appointment) {
    throw new Error('Appointment not found for image screening update.');
  }

  // 1. Update or create MedicalImageAnalysis record
  let imageRecord = await MedicalImageAnalysis.findOne({ appointment: appointment._id });
  if (!imageRecord) {
    imageRecord = new MedicalImageAnalysis({
      appointment: appointment._id,
      patient: appointment.patient._id,
      screeningStatus,
      imageScore: Number(imageScore),
      possibleFindings: Array.isArray(possibleFindings) ? possibleFindings : [possibleFindings],
      modelVersion,
      confidenceSignal: Number(confidenceSignal),
      findingsDetails,
      publicId: publicId || appointment.medicalImage?.publicId,
      assetId: assetId || appointment.medicalImage?.assetId,
      imageUrl: imageUrl || appointment.medicalImage?.secureUrl || appointment.medicalImageUrl,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });
  } else {
    imageRecord.screeningStatus = screeningStatus;
    imageRecord.imageScore = Number(imageScore);
    imageRecord.possibleFindings = Array.isArray(possibleFindings) ? possibleFindings : [possibleFindings];
    imageRecord.modelVersion = modelVersion;
    imageRecord.confidenceSignal = Number(confidenceSignal);
    imageRecord.findingsDetails = findingsDetails;
    if (publicId) imageRecord.publicId = publicId;
    if (assetId) imageRecord.assetId = assetId;
    if (imageUrl) imageRecord.imageUrl = imageUrl;
    imageRecord.timestamp = timestamp ? new Date(timestamp) : new Date();
  }

  await imageRecord.save();

  // 2. Update Appointment medicalImage lifecycle status
  if (appointment.medicalImage) {
    appointment.medicalImage.status = 'ANALYZED';
    appointment.medicalImage.analysisCompletedAt = new Date();
    await appointment.save();
  }

  logger.info(
    `[ML Image Screening Processed] Token: ${appointment.tokenNumber}, Status: ${screeningStatus}, Score: ${imageScore}, Model: ${modelVersion}`
  );

  // 3. Recalculate priority score dynamically using the new image score
  const updateResult = await updateAppointmentPriority(appointment._id);

  // 4. Emit real-time Socket.IO updates to Doctor and Department rooms
  try {
    socketEmitter.emitPriorityUpdated(appointment.tokenNumber, appointment.department, {
      tokenNumber: appointment.tokenNumber,
      appointmentId: appointment._id,
      imageScore,
      screeningStatus,
      newPriorityScore: updateResult?.priorityResult?.priorityScore,
    });
  } catch (err) {
    logger.warn(`[Socket Emit Warning] Failed to emit priority update: ${err.message}`);
  }

  return {
    appointment,
    imageRecord,
    updatedPriority: updateResult?.priorityResult || null,
  };
};

/**
 * Asynchronously triggers external TensorFlow DenseNet-121 ML screening without blocking
 * the patient's appointment creation or token issuance.
 */
const triggerAsyncImageAnalysis = async ({
  appointmentId,
  tokenNumber,
  patientId,
  imageUrl,
  imageId,
  publicId,
}) => {
  // Run in background without blocking controller response
  setImmediate(async () => {
    try {
      await Appointment.findByIdAndUpdate(appointmentId, {
        'medicalImage.status': 'ANALYZING',
        'medicalImage.analysisStartedAt': new Date(),
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), mlTimeoutMs);

      const requestPayload = {
        appointmentId: String(appointmentId),
        tokenNumber,
        imageUrl,
      };

      const targetEndpoint = `${mlServiceUrl.replace(/\/$/, '')}/predict-url`;

      const response = await fetch(targetEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Aarogya-Pravah-AI-Backend/1.0',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`ML service responded with HTTP status ${response.status}`);
      }

      const data = await response.json();

      if (data.screeningStatus) {
        await processScreeningResult({
          appointmentId,
          tokenNumber,
          screeningStatus: data.screeningStatus || 'NORMAL',
          imageScore: data.imageScore || 0.0,
          possibleFindings: data.possibleFindings || [],
          modelVersion: data.modelVersion || 'densenet121-tf-v1.0',
          confidenceSignal: data.confidenceSignal || 0.85,
          findingsDetails: { predictedClass: data.predictedClass, classBreakdown: data.classBreakdown },
          imageUrl,
          publicId,
        });
      } else {
        throw new Error('Unrecognized response format from TensorFlow ML service.');
      }
    } catch (error) {
      logger.warn(
        `[TensorFlow ML Service Warning] ML inference for Token ${tokenNumber} engaged fallback: ${error.message}`
      );
      try {
        await Appointment.findByIdAndUpdate(appointmentId, {
          'medicalImage.status': 'ANALYSIS_PENDING',
          'medicalImage.analysisError': error.message,
        });
      } catch (err) {
        // ignore
      }
    }
  });
};

module.exports = {
  processScreeningResult,
  triggerAsyncImageAnalysis,
};
