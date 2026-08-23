const { body, param } = require('express-validator');
const { QueueEntry } = require('../models/QueueEntry');
const { Appointment } = require('../models/Appointment');
const Consultation = require('../models/Consultation');
const { AIAnalysis } = require('../models/AIAnalysis');
const { MedicalImageAnalysis } = require('../models/MedicalImageAnalysis');
const {
  startConsultation,
  completeConsultation,
  holdPatient,
  resumePatient,
} = require('../services/queueService');
const { recordAuditLog } = require('../services/auditService');
const ApiResponse = require('../utils/apiResponse');

/**
 * @route   GET /api/doctor/queue
 * @desc    Get prioritized waiting queue for doctor's department
 * @access  Private (Doctor, Staff)
 */
const getDoctorQueue = async (req, res, next) => {
  try {
    const department = req.query.department || req.user.department || 'General Medicine';

    // Fetch active waiting queue sorted by priority
    const queueEntries = await QueueEntry.find({
      department,
      status: { $in: ['WAITING', 'IN_CONSULTATION'] },
    })
      .populate({
        path: 'appointment',
        select:
          'tokenNumber department symptoms symptomsDescription reportedSeverity staffSeverity isAccident accidentSeverity medicalImageUrl medicalImageType medicalImage appointmentDate status',
      })
      .populate('patient', 'name age gender phoneNumber bloodGroup allergies')
      .populate('assignedDoctor', 'name specialization')
      .sort({ status: 1, priorityScore: -1, checkInTime: 1 });

    // Attach AI analysis and Image analysis to each queue entry for doctor view
    const appointmentIds = queueEntries.map((q) => q.appointment?._id).filter(Boolean);

    const [aiAnalyses, imageAnalyses] = await Promise.all([
      AIAnalysis.find({ appointment: { $in: appointmentIds } }),
      MedicalImageAnalysis.find({ appointment: { $in: appointmentIds } }),
    ]);

    const aiMap = new Map(aiAnalyses.map((a) => [a.appointment.toString(), a]));
    const imageMap = new Map(imageAnalyses.map((i) => [i.appointment.toString(), i]));

    const enrichedQueue = queueEntries.map((entry) => {
      const entryObj = entry.toObject();
      const apptId = entry.appointment?._id?.toString();
      entryObj.aiAnalysis = apptId ? aiMap.get(apptId) || null : null;
      entryObj.imageAnalysis = apptId ? imageMap.get(apptId) || null : null;
      return entryObj;
    });

    return ApiResponse.success(res, 'Doctor prioritized queue retrieved', {
      department,
      count: enrichedQueue.length,
      queue: enrichedQueue,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/doctor/pending-queue
 * @desc    Get all patients currently on hold (PENDING) in department
 * @access  Private (Doctor, Staff)
 */
const getPendingQueue = async (req, res, next) => {
  try {
    const department = req.query.department || req.user.department || 'General Medicine';

    const pendingEntries = await QueueEntry.find({
      department,
      status: 'PENDING',
      isPending: true,
    })
      .populate('appointment')
      .populate('patient', 'name age gender phoneNumber')
      .populate('pendingDetails.heldByDoctor', 'name')
      .sort({ 'pendingDetails.heldAt': -1 });

    return ApiResponse.success(res, 'Pending patients on hold retrieved', {
      department,
      count: pendingEntries.length,
      pendingQueue: pendingEntries,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/doctor/patient/:id
 * @desc    Get detailed medical & triage view of a patient for consultation
 * @access  Private (Doctor)
 */
const getPatientClinicalDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id)
      .populate('patient')
      .populate('verifiedBy', 'name role')
      .populate('assignedDoctor', 'name specialization');

    if (!appointment) {
      return ApiResponse.notFound(res, 'Appointment not found');
    }

    const [aiAnalysis, imageAnalysis, queueEntry, pastConsultations] = await Promise.all([
      AIAnalysis.findOne({ appointment: id }),
      MedicalImageAnalysis.findOne({ appointment: id }),
      QueueEntry.findOne({ appointment: id }),
      Consultation.find({ patient: appointment.patient._id }).populate('doctor', 'name specialization').sort({ createdAt: -1 }),
    ]);

    return ApiResponse.success(res, 'Clinical patient record retrieved', {
      appointment,
      patient: appointment.patient,
      aiAnalysis,
      imageAnalysis,
      queueEntry,
      pastConsultations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/doctor/consultation/start
 * @desc    Doctor calls/starts consultation with patient
 * @access  Private (Doctor)
 */
const startPatientConsultation = async (req, res, next) => {
  try {
    const { queueEntryId } = req.body;

    const result = await startConsultation(queueEntryId, req.user);

    await recordAuditLog({
      user: req.user,
      action: 'CONSULTATION_STARTED',
      targetType: 'CONSULTATION',
      targetId: result.consultation._id,
      details: { tokenNumber: result.appointment.tokenNumber },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return ApiResponse.success(res, 'Consultation started successfully', result);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/doctor/consultation/complete
 * @desc    Doctor completes consultation with notes, vitals, prescriptions
 * @access  Private (Doctor)
 */
const completePatientConsultation = async (req, res, next) => {
  try {
    const {
      queueEntryId,
      clinicalNotes,
      diagnosisNotes,
      vitals,
      prescriptions = [],
      recommendedFollowUp,
    } = req.body;

    const result = await completeConsultation(queueEntryId, req.user, {
      clinicalNotes,
      diagnosisNotes,
      vitals,
      prescriptions,
      recommendedFollowUp,
    });

    await recordAuditLog({
      user: req.user,
      action: 'CONSULTATION_COMPLETED',
      targetType: 'CONSULTATION',
      targetId: result.consultation._id,
      details: {
        tokenNumber: result.appointment.tokenNumber,
        durationMinutes: result.consultation.durationMinutes,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return ApiResponse.success(res, 'Consultation completed successfully', result);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/doctor/queue/hold
 * @desc    Put patient on hold (PENDING) while awaiting tests/scans
 * @access  Private (Doctor)
 */
const holdPatientInQueue = async (req, res, next) => {
  try {
    const { queueEntryId, reason, category, notes } = req.body;

    if (!reason || reason.trim() === '') {
      return ApiResponse.badRequest(res, 'A reason for placing the patient on hold is required.');
    }

    const result = await holdPatient(queueEntryId, req.user, {
      reason,
      category,
      notes,
    });

    await recordAuditLog({
      user: req.user,
      action: 'PATIENT_HELD',
      targetType: 'QUEUE',
      targetId: queueEntryId,
      details: { tokenNumber: result.appointment.tokenNumber, reason, category },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return ApiResponse.success(res, 'Patient placed on hold (PENDING status)', result);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/doctor/queue/resume
 * @desc    Resume patient from hold back to priority queue with boost
 * @access  Private (Doctor)
 */
const resumePatientToQueue = async (req, res, next) => {
  try {
    const { queueEntryId } = req.body;

    const result = await resumePatient(queueEntryId, req.user);

    await recordAuditLog({
      user: req.user,
      action: 'PATIENT_RESUMED',
      targetType: 'QUEUE',
      targetId: queueEntryId,
      details: { tokenNumber: result.appointment.tokenNumber },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return ApiResponse.success(res, 'Patient resumed and returned to active queue with priority boost', result);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/doctor/history
 * @desc    Get doctor's completed consultations
 * @access  Private (Doctor)
 */
const getDoctorHistory = async (req, res, next) => {
  try {
    const consultations = await Consultation.find({ doctor: req.user._id, status: 'COMPLETED' })
      .populate('patient', 'name age gender phoneNumber')
      .populate('appointment', 'tokenNumber department symptoms reportedSeverity')
      .sort({ endTime: -1 })
      .limit(50);

    return ApiResponse.success(res, 'Consultation history retrieved', {
      count: consultations.length,
      consultations,
    });
  } catch (error) {
    next(error);
  }
};

// Validation rules
const startConsultationValidation = [
  body('queueEntryId').isMongoId().withMessage('Valid queueEntryId is required'),
];

const completeConsultationValidation = [
  body('queueEntryId').isMongoId().withMessage('Valid queueEntryId is required'),
  body('clinicalNotes').optional().isString(),
  body('diagnosisNotes').optional().isString(),
];

const holdValidation = [
  body('queueEntryId').isMongoId().withMessage('Valid queueEntryId is required'),
  body('reason').trim().notEmpty().withMessage('Reason is required'),
  body('category')
    .optional()
    .isIn(['LAB_RESULTS', 'XRAY_SCAN', 'SPECIALIST_REVIEW', 'VITALS_STABILIZATION', 'PATIENT_UNAVAILABLE', 'OTHER'])
    .withMessage('Invalid hold category'),
];

module.exports = {
  getDoctorQueue,
  getPendingQueue,
  getPatientClinicalDetails,
  startPatientConsultation,
  completePatientConsultation,
  holdPatientInQueue,
  resumePatientToQueue,
  getDoctorHistory,
  startConsultationValidation,
  completeConsultationValidation,
  holdValidation,
};
