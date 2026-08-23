const { body, param } = require('express-validator');
const Patient = require('../models/Patient');
const { Appointment } = require('../models/Appointment');
const { QueueEntry } = require('../models/QueueEntry');
const { generateTokenNumber } = require('../utils/tokenGenerator');
const { socketEmitter } = require('../sockets/socketEmitter');
const { getPublicPatientStatus } = require('../services/queueService');
const { uploadMedicalImageStream } = require('../services/cloudinaryService');
const { triggerAsyncImageAnalysis } = require('../services/imageAnalysisService');
const ApiResponse = require('../utils/apiResponse');
const config = require('../config/priorityConfig');
const logger = require('../utils/logger');

/**
 * Normalize incoming medical image type to standard canonical enum value.
 */
const normalizeMedicalImageType = (type, hasFile = false) => {
  if (!type && !hasFile) return 'NONE';
  if (!type && hasFile) return 'XRAY';
  const clean = String(type).trim().toUpperCase().replace(/[-\s]/g, '_');
  if (clean === 'X_RAY' || clean === 'XRAY') return 'XRAY';
  if (clean === 'CT_SCAN' || clean === 'CTSCAN' || clean === 'CT') return 'CT_SCAN';
  if (clean === 'MRI') return 'MRI';
  if (clean === 'PHOTO') return 'PHOTO';
  if (clean === 'NONE') return 'NONE';
  return 'OTHER';
};

/**
 * @route   POST /api/patients/appointments
 * @desc    Book a new patient appointment (No login required for MVP)
 * @access  Public
 */
const bookAppointment = async (req, res, next) => {
  try {
    const {
      name,
      age,
      gender,
      phoneNumber,
      email,
      department = 'General Medicine',
      possibleCondition = '',
      symptoms = [],
      symptomsDescription = '',
      severityLevel = 'MEDIUM',
      isAccident = false,
      accidentSeverity = 'NONE',
      appointmentDate,
      medicalImageType,
    } = req.body;

    // Normalize and validate medicalImageType before processing
    const normalizedImageType = normalizeMedicalImageType(medicalImageType, Boolean(req.file));

    // Normalize symptoms array if sent as comma-separated string
    let parsedSymptoms = symptoms;
    if (typeof symptoms === 'string') {
      parsedSymptoms = symptoms.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (!Array.isArray(parsedSymptoms) || parsedSymptoms.length === 0) {
      parsedSymptoms = ['General discomfort / Unspecified symptom'];
    }

    // 1. Create or retrieve existing patient record by phone & name
    let patient = await Patient.findOne({ phoneNumber, name });
    if (!patient) {
      patient = await Patient.create({
        name,
        age: Number(age),
        gender,
        phoneNumber,
        email,
      });
    }

    // 2. Generate unique token number
    const isAccidentCase = isAccident === true || isAccident === 'true';
    const tokenNumber = generateTokenNumber(department, isAccidentCase);

    // 3. Handle optional uploaded medical image via Cloudinary streaming
    let medicalImageUrl = '';
    let medicalImageAsset = null;

    if (req.file) {
      try {
        medicalImageAsset = await uploadMedicalImageStream(req.file.buffer, {
          patientId: patient._id,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
        });
        medicalImageUrl = medicalImageAsset.secureUrl;
      } catch (uploadError) {
        logger.error(`[Medical Image Upload Failed] ${uploadError.message}`);
        // Allow appointment booking to proceed even if image upload encounters an error
      }
    }

    // 4. Calculate initial estimated waiting time
    const avgMinutesPerPatient =
      config.departmentConsultationMinutes[department] ||
      config.defaultAverageConsultationMinutes;

    const currentWaitingCount = await QueueEntry.countDocuments({
      department,
      status: 'WAITING',
      isPending: false,
    });

    const initialEstimatedWaitMinutes = (currentWaitingCount + 1) * avgMinutesPerPatient;

    // 5. Create Appointment Record
    const appointment = await Appointment.create({
      tokenNumber,
      patient: patient._id,
      department,
      possibleCondition,
      symptoms: parsedSymptoms,
      symptomsDescription,
      reportedSeverity: (severityLevel || 'MEDIUM').toUpperCase(),
      isAccident: isAccidentCase,
      accidentSeverity: isAccidentCase ? (accidentSeverity || 'MEDIUM').toUpperCase() : 'NONE',
      medicalImage: medicalImageAsset || undefined,
      medicalImageUrl,
      medicalImageType: normalizedImageType,
      appointmentDate: appointmentDate ? new Date(appointmentDate) : new Date(),
      status: 'PENDING_STAFF_VERIFICATION',
      initialEstimatedWaitMinutes,
    });

    // 6. Asynchronously trigger ML screening if image was uploaded (non-blocking)
    if (medicalImageAsset && medicalImageAsset.secureUrl) {
      triggerAsyncImageAnalysis({
        appointmentId: appointment._id,
        tokenNumber: appointment.tokenNumber,
        patientId: patient._id,
        imageUrl: medicalImageAsset.secureUrl,
        imageId: medicalImageAsset.assetId,
        publicId: medicalImageAsset.publicId,
      });
    }

    // Populate patient for socket emission
    const populatedAppointment = await Appointment.findById(appointment._id).populate('patient');

    // 6. Emit real-time notification to staff dashboard
    socketEmitter.emitNewPatient(populatedAppointment);

    logger.info(`[Appointment Booked] Token: ${tokenNumber}, Dept: ${department}, Patient: ${name}`);

    // 7. Return patient tracking view
    return ApiResponse.created(res, 'Appointment successfully booked and queued for staff verification', {
      tokenNumber: appointment.tokenNumber,
      appointmentId: appointment._id,
      patientName: patient.name,
      department: appointment.department,
      appointmentTime: appointment.appointmentDate,
      estimatedWaitMinutes: appointment.initialEstimatedWaitMinutes,
      status: appointment.status,
      message:
        'Your appointment has been registered. Please wait for hospital staff to verify your check-in. You can track your live queue position using your token number.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/patients/token/:tokenNumber
 * @desc    Get patient tracking status by unique token number (Privacy-Safe)
 * @access  Public
 */
const getPatientByToken = async (req, res, next) => {
  try {
    const { tokenNumber } = req.params;

    const publicStatus = await getPublicPatientStatus(tokenNumber);

    if (!publicStatus) {
      return ApiResponse.notFound(res, `No appointment found with token number: ${tokenNumber}`);
    }

    return ApiResponse.success(res, 'Patient queue status retrieved successfully', publicStatus);
  } catch (error) {
    next(error);
  }
};

// Validation rules
const bookAppointmentValidation = [
  body('name').trim().notEmpty().withMessage('Patient name is required'),
  body('age').isInt({ min: 0, max: 130 }).withMessage('Valid age between 0 and 130 is required'),
  body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),
  body('phoneNumber').trim().notEmpty().withMessage('Contact phone number is required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('severityLevel')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .withMessage('Severity level must be LOW, MEDIUM, HIGH, or CRITICAL'),
];

const tokenParamValidation = [
  param('tokenNumber').trim().notEmpty().withMessage('Token number is required'),
];

module.exports = {
  bookAppointment,
  getPatientByToken,
  bookAppointmentValidation,
  tokenParamValidation,
};
