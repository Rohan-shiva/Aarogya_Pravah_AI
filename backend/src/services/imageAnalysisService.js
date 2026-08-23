const { Appointment } = require('../models/Appointment');
const { MedicalImageAnalysis } = require('../models/MedicalImageAnalysis');
const { updateAppointmentPriority } = require('../services/queueService');
const { socketEmitter } = require('../sockets/socketEmitter');
const logger = require('../utils/logger');

const pytorchServiceUrl = process.env.PYTORCH_SERVICE_URL;
const pytorchTimeoutMs = parseInt(process.env.PYTORCH_SERVICE_TIMEOUT, 10) || 10000;

/**
 * Process a screening result payload from the PyTorch service (or webhook),
 * persist the screening metadata in MongoDB, recalculate queue priority,
 * and broadcast real-time updates to staff and doctors.
 */
const processScreeningResult = async ({
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
    `[PyTorch Screening Processed] Token: ${appointment.tokenNumber}, Status: ${screeningStatus}, Score: ${imageScore}`
  );

  // 3. Recalculate priority score dynamically using the new image score
  const updateResult = await updateAppointmentPriority(appointment._id);

  // 4. Emit real-time Socket.IO updates to Doctor and Department rooms
  try {
    socketEmitter.emitPriorityUpdated(appointment.department, {
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
 * Asynchronously triggers external Python/PyTorch image screening without blocking
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
  // If no Python ML service URL is configured, mark status as ANALYSIS_PENDING
  if (!pytorchServiceUrl) {
    logger.info(
      `[Image Screening Service] PYTORCH_SERVICE_URL is not set. Image analysis for Token: ${tokenNumber} remains pending until webhook ingestion.`
    );
    try {
      await Appointment.findByIdAndUpdate(appointmentId, {
        'medicalImage.status': 'ANALYSIS_PENDING',
        'medicalImage.analysisStartedAt': new Date(),
      });
    } catch (e) {
      logger.warn(`Failed to update image status: ${e.message}`);
    }
    return;
  }

  // Run in background without awaiting in the controller
  setImmediate(async () => {
    try {
      await Appointment.findByIdAndUpdate(appointmentId, {
        'medicalImage.status': 'ANALYZING',
        'medicalImage.analysisStartedAt': new Date(),
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), pytorchTimeoutMs);

      // Clean request payload: Never expose Cloudinary secrets
      const requestPayload = {
        appointmentId: String(appointmentId),
        tokenNumber,
        patientId: String(patientId),
        imageUrl,
        imageId: imageId || publicId,
        requestId: `req_${Date.now()}_${String(appointmentId).slice(-6)}`,
      };

      const response = await fetch(`${pytorchServiceUrl.replace(/\/$/, '')}/api/v1/screen-xray`, {
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
        throw new Error(`PyTorch service responded with HTTP status ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.screening) {
        await processScreeningResult({
          appointmentId,
          tokenNumber,
          screeningStatus: data.screening.status || 'NORMAL',
          imageScore: data.screening.score || 0.0,
          possibleFindings: data.screening.findings || [],
          modelVersion: data.screening.modelVersion || 'pytorch-med-screen-v1.0',
          confidenceSignal: data.screening.confidenceSignal || 0.85,
          findingsDetails: data.screening.findingsDetails || {},
          imageUrl,
          publicId,
        });
      } else {
        throw new Error(data.message || 'Unrecognized response format from PyTorch service.');
      }
    } catch (error) {
      logger.error(
        `[PyTorch ML Service Error] Failed to screen image for Token ${tokenNumber}: ${error.message}`
      );
      try {
        await Appointment.findByIdAndUpdate(appointmentId, {
          'medicalImage.status': 'ANALYSIS_FAILED',
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
