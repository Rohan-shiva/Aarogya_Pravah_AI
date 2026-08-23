const { body, param } = require('express-validator');
const { Appointment } = require('../models/Appointment');
const Patient = require('../models/Patient');
const { QueueEntry } = require('../models/QueueEntry');
const { AIAnalysis } = require('../models/AIAnalysis');
const { MedicalImageAnalysis } = require('../models/MedicalImageAnalysis');
const { analyzePatientTriage } = require('../services/groqService');
const { calculatePriorityScore } = require('../services/priorityService');
const { recalculateDepartmentQueue } = require('../services/queueService');
const { socketEmitter } = require('../sockets/socketEmitter');
const { recordAuditLog } = require('../services/auditService');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * @route   GET /api/staff/pending-verifications
 * @desc    View all newly submitted patients waiting for staff verification
 * @access  Private (Staff, Doctor)
 */
const getPendingVerifications = async (req, res, next) => {
  try {
    const { department } = req.query;
    const filter = {
      status: { $in: ['PENDING_STAFF_VERIFICATION', 'REQUIRES_CLARIFICATION'] },
    };

    if (department) {
      filter.department = department;
    }

    const appointments = await Appointment.find(filter)
      .populate('patient')
      .sort({ createdAt: -1 });

    return ApiResponse.success(
      res,
      'Pending patient verifications retrieved',
      { count: appointments.length, appointments }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/staff/patient/:id
 * @desc    View complete patient and appointment details
 * @access  Private (Staff, Doctor)
 */
const getPatientDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id)
      .populate('patient')
      .populate('verifiedBy', 'name role department')
      .populate('assignedDoctor', 'name specialization department');

    if (!appointment) {
      return ApiResponse.notFound(res, 'Appointment not found');
    }

    const [aiAnalysis, imageAnalysis, queueEntry] = await Promise.all([
      AIAnalysis.findOne({ appointment: id }),
      MedicalImageAnalysis.findOne({ appointment: id }),
      QueueEntry.findOne({ appointment: id }),
    ]);

    return ApiResponse.success(res, 'Patient details retrieved', {
      appointment,
      patient: appointment.patient,
      aiAnalysis,
      imageAnalysis,
      queueEntry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/staff/verify/:id
 * @desc    Verify and approve patient, trigger Groq AI triage, calculate priority, and insert into smart queue
 * @access  Private (Staff)
 */
const verifyPatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      staffSeverity,
      verificationNotes = '',
      isAccident,
      accidentSeverity,
      department,
    } = req.body;

    const appointment = await Appointment.findById(id).populate('patient');
    if (!appointment) {
      return ApiResponse.notFound(res, 'Appointment record not found');
    }

    // Update appointment fields
    if (staffSeverity) appointment.staffSeverity = staffSeverity.toUpperCase();
    if (verificationNotes) appointment.verificationNotes = verificationNotes;
    if (typeof isAccident !== 'undefined') appointment.isAccident = Boolean(isAccident);
    if (accidentSeverity) appointment.accidentSeverity = accidentSeverity.toUpperCase();
    if (department) appointment.department = department;

    appointment.status = 'VERIFIED';
    appointment.verifiedBy = req.user._id;
    await appointment.save();

    // 1. Trigger Groq AI clinical triage analysis
    logger.info(`[Triage] Triggering Groq AI analysis for token ${appointment.tokenNumber}...`);
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

    // Save or update AIAnalysis record
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

    // 2. Fetch existing medical image screening result if present
    const imageAnalysis = await MedicalImageAnalysis.findOne({ appointment: appointment._id });

    // 3. Calculate initial multi-factor priority score
    const priorityResult = calculatePriorityScore({
      staffSeverity: appointment.staffSeverity,
      reportedSeverity: appointment.reportedSeverity,
      isAccident: appointment.isAccident,
      accidentSeverity: appointment.accidentSeverity,
      aiAnalysis: aiRecord,
      imageAnalysis,
      checkInTime: new Date(),
      isPending: false,
    });

    // 4. Create or update QueueEntry
    let queueEntry = await QueueEntry.findOne({ appointment: appointment._id });
    if (!queueEntry) {
      queueEntry = new QueueEntry({
        appointment: appointment._id,
        patient: appointment.patient._id,
        department: appointment.department,
        priorityScore: priorityResult.priorityScore,
        priorityLevel: priorityResult.priorityLevel,
        scoreBreakdown: priorityResult.scoreBreakdown,
        status: 'WAITING',
        checkInTime: new Date(),
      });
    } else {
      queueEntry.department = appointment.department;
      queueEntry.priorityScore = priorityResult.priorityScore;
      queueEntry.priorityLevel = priorityResult.priorityLevel;
      queueEntry.scoreBreakdown = priorityResult.scoreBreakdown;
      queueEntry.status = 'WAITING';
      queueEntry.isPending = false;
    }

    await queueEntry.save();

    // Link queue entry in appointment
    appointment.queueEntry = queueEntry._id;
    await appointment.save();

    // 5. Recalculate department queue order and estimated wait times
    await recalculateDepartmentQueue(appointment.department);

    // Refresh queue entry after recalculation
    const refreshedQueueEntry = await QueueEntry.findById(queueEntry._id);

    // 6. Real-time broadcast
    socketEmitter.emitPatientVerified(appointment, refreshedQueueEntry);

    // 7. Audit log
    await recordAuditLog({
      user: req.user,
      action: 'PATIENT_VERIFIED',
      targetType: 'APPOINTMENT',
      targetId: appointment._id,
      details: {
        tokenNumber: appointment.tokenNumber,
        staffSeverity: appointment.staffSeverity,
        priorityScore: priorityResult.priorityScore,
        priorityLevel: priorityResult.priorityLevel,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return ApiResponse.success(
      res,
      'Patient successfully verified and placed in dynamic priority queue',
      {
        appointment,
        aiAnalysis: aiRecord,
        queueEntry: refreshedQueueEntry,
        priorityResult,
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/staff/request-clarification/:id
 * @desc    Flag patient appointment as REQUIRES_CLARIFICATION
 * @access  Private (Staff)
 */
const requestClarification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { clarificationReason } = req.body;

    if (!clarificationReason || clarificationReason.trim() === '') {
      return ApiResponse.badRequest(res, 'Please provide a clear reason for requesting clarification.');
    }

    const appointment = await Appointment.findById(id).populate('patient');
    if (!appointment) {
      return ApiResponse.notFound(res, 'Appointment not found');
    }

    appointment.status = 'REQUIRES_CLARIFICATION';
    appointment.clarificationReason = clarificationReason;
    appointment.verifiedBy = req.user._id;
    await appointment.save();

    // Notify patient
    socketEmitter.emitPatientStatusUpdated(appointment.tokenNumber, {
      status: 'REQUIRES_CLARIFICATION',
      clarificationReason,
      message: `Hospital staff requested clarification on your intake information: ${clarificationReason}. Please visit the front desk.`,
    });

    await recordAuditLog({
      user: req.user,
      action: 'PATIENT_REQUIRES_CLARIFICATION',
      targetType: 'APPOINTMENT',
      targetId: appointment._id,
      details: { tokenNumber: appointment.tokenNumber, reason: clarificationReason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return ApiResponse.success(res, 'Patient flagged for clarification', { appointment });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/staff/reject/:id
 * @desc    Reject patient appointment
 * @access  Private (Staff)
 */
const rejectPatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejectionReason = 'Information unverified or invalid booking.' } = req.body;

    const appointment = await Appointment.findById(id).populate('patient');
    if (!appointment) {
      return ApiResponse.notFound(res, 'Appointment not found');
    }

    appointment.status = 'REJECTED';
    appointment.rejectionReason = rejectionReason;
    appointment.verifiedBy = req.user._id;
    await appointment.save();

    // Remove from queue if any
    await QueueEntry.deleteOne({ appointment: appointment._id });
    await recalculateDepartmentQueue(appointment.department);

    socketEmitter.emitPatientStatusUpdated(appointment.tokenNumber, {
      status: 'REJECTED',
      rejectionReason,
      message: `Your appointment could not be processed: ${rejectionReason}`,
    });

    await recordAuditLog({
      user: req.user,
      action: 'PATIENT_REJECTED',
      targetType: 'APPOINTMENT',
      targetId: appointment._id,
      details: { tokenNumber: appointment.tokenNumber, reason: rejectionReason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return ApiResponse.success(res, 'Appointment rejected', { appointment });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/staff/update-severity/:id
 * @desc    Update clinical severity and recalculate queue
 * @access  Private (Staff, Doctor)
 */
const updateSeverity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { severity } = req.body;

    const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    if (!validSeverities.includes(severity?.toUpperCase())) {
      return ApiResponse.badRequest(res, 'Severity must be LOW, MEDIUM, HIGH, or CRITICAL');
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return ApiResponse.notFound(res, 'Appointment not found');
    }

    appointment.staffSeverity = severity.toUpperCase();
    await appointment.save();

    // Recalculate priority if queue entry exists
    const queueEntry = await QueueEntry.findOne({ appointment: appointment._id });
    if (queueEntry) {
      const [aiAnalysis, imageAnalysis] = await Promise.all([
        AIAnalysis.findOne({ appointment: appointment._id }),
        MedicalImageAnalysis.findOne({ appointment: appointment._id }),
      ]);

      const priorityResult = calculatePriorityScore({
        staffSeverity: appointment.staffSeverity,
        reportedSeverity: appointment.reportedSeverity,
        isAccident: appointment.isAccident,
        accidentSeverity: appointment.accidentSeverity,
        aiAnalysis,
        imageAnalysis,
        checkInTime: queueEntry.checkInTime,
        isPending: queueEntry.isPending,
      });

      queueEntry.priorityScore = priorityResult.priorityScore;
      queueEntry.priorityLevel = priorityResult.priorityLevel;
      queueEntry.scoreBreakdown = priorityResult.scoreBreakdown;
      await queueEntry.save();

      await recalculateDepartmentQueue(queueEntry.department);
    }

    await recordAuditLog({
      user: req.user,
      action: 'SEVERITY_OVERRIDDEN',
      targetType: 'APPOINTMENT',
      targetId: appointment._id,
      details: { severity: appointment.staffSeverity },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return ApiResponse.success(res, 'Severity updated and queue recalculated', { appointment });
  } catch (error) {
    next(error);
  }
};

// Validation rules
const verifyValidation = [
  param('id').isMongoId().withMessage('Valid appointment ID is required'),
  body('staffSeverity')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .withMessage('Staff severity must be LOW, MEDIUM, HIGH, or CRITICAL'),
];

const clarificationValidation = [
  param('id').isMongoId().withMessage('Valid appointment ID is required'),
  body('clarificationReason').trim().notEmpty().withMessage('Clarification reason is required'),
];

module.exports = {
  getPendingVerifications,
  getPatientDetails,
  verifyPatient,
  requestClarification,
  rejectPatient,
  updateSeverity,
  verifyValidation,
  clarificationValidation,
};
