const { QueueEntry } = require('../models/QueueEntry');
const { Appointment } = require('../models/Appointment');
const { AIAnalysis } = require('../models/AIAnalysis');
const { MedicalImageAnalysis } = require('../models/MedicalImageAnalysis');
const Consultation = require('../models/Consultation');
const User = require('../models/User');
const { calculatePriorityScore } = require('./priorityService');
const { socketEmitter } = require('../sockets/socketEmitter');
const config = require('../config/priorityConfig');
const logger = require('../utils/logger');

/**
 * Recalculate queue positions and estimated wait times for a department
 * @param {string} department - Department name
 */
const recalculateDepartmentQueue = async (department) => {
  try {
    // 1. Fetch all active waiting entries for the department
    const waitingEntries = await QueueEntry.find({
      department,
      status: 'WAITING',
      isPending: false,
    })
      .populate('appointment')
      .populate('patient', 'name age gender phoneNumber');

    // 2. Sort by priorityScore (DESC), then checkInTime (ASC) for tie-breaking
    waitingEntries.sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      return new Date(a.checkInTime) - new Date(b.checkInTime);
    });

    // 3. Count active doctors in this department
    const activeDoctorCount = await User.countDocuments({
      role: 'DOCTOR',
      department,
      isActive: true,
    });
    const effectiveDoctors = Math.max(1, activeDoctorCount);

    const avgMinutesPerPatient =
      config.departmentConsultationMinutes[department] ||
      config.defaultAverageConsultationMinutes;

    // 4. Update queue positions and estimated wait times in bulk
    const updatePromises = waitingEntries.map((entry, index) => {
      const position = index + 1;
      // Estimated wait = (position - 1) * avgMinutes / activeDoctors
      const estimatedWait = Math.round(((position - 1) * avgMinutesPerPatient) / effectiveDoctors);

      entry.queuePosition = position;
      entry.estimatedWaitMinutes = estimatedWait;

      return entry.save();
    });

    await Promise.all(updatePromises);

    // 5. Emit real-time queue update
    socketEmitter.emitQueueUpdated(department, waitingEntries);

    return waitingEntries;
  } catch (error) {
    logger.error(`[Queue Recalculate Error] Dept: ${department}, Error: ${error.message}`);
    throw error;
  }
};

/**
 * Recalculate a specific patient's priority score from database records
 * @param {string} appointmentId
 * @param {boolean} isReturningFromPending
 */
const updateAppointmentPriority = async (appointmentId, isReturningFromPending = false) => {
  const appointment = await Appointment.findById(appointmentId).populate('patient');
  if (!appointment) return null;

  const [aiAnalysis, imageAnalysis, queueEntry] = await Promise.all([
    AIAnalysis.findOne({ appointment: appointmentId }),
    MedicalImageAnalysis.findOne({ appointment: appointmentId }),
    QueueEntry.findOne({ appointment: appointmentId }),
  ]);

  if (!queueEntry) return null;

  const priorityResult = calculatePriorityScore({
    staffSeverity: appointment.staffSeverity,
    reportedSeverity: appointment.reportedSeverity,
    isAccident: appointment.isAccident,
    accidentSeverity: appointment.accidentSeverity,
    aiAnalysis,
    imageAnalysis,
    checkInTime: queueEntry.checkInTime,
    isPending: queueEntry.isPending,
    isReturningFromPending,
  });

  queueEntry.priorityScore = priorityResult.priorityScore;
  queueEntry.priorityLevel = priorityResult.priorityLevel;
  queueEntry.scoreBreakdown = priorityResult.scoreBreakdown;
  queueEntry.lastPriorityUpdate = new Date();

  await queueEntry.save();

  // Recalculate the entire department queue
  await recalculateDepartmentQueue(queueEntry.department);

  // Emit priority updated event
  socketEmitter.emitPriorityUpdated(appointment.tokenNumber, queueEntry.department, {
    priorityScore: priorityResult.priorityScore,
    priorityLevel: priorityResult.priorityLevel,
    factorsUsed: priorityResult.factorsUsed,
  });

  return { queueEntry, priorityResult };
};

/**
 * Start a doctor consultation for a queue entry
 */
const startConsultation = async (queueEntryId, doctorUser) => {
  const queueEntry = await QueueEntry.findById(queueEntryId)
    .populate('appointment')
    .populate('patient');

  if (!queueEntry) {
    throw new Error('Queue entry not found');
  }

  if (queueEntry.status === 'IN_CONSULTATION') {
    throw new Error('This patient is already currently in consultation');
  }

  // Update queue entry
  queueEntry.status = 'IN_CONSULTATION';
  queueEntry.consultationStartTime = new Date();
  queueEntry.assignedDoctor = doctorUser._id;
  queueEntry.isPending = false;
  await queueEntry.save();

  // Update appointment
  const appointment = await Appointment.findById(queueEntry.appointment._id);
  appointment.status = 'IN_CONSULTATION';
  appointment.assignedDoctor = doctorUser._id;
  await appointment.save();

  // Create or find in-progress consultation
  let consultation = await Consultation.findOne({
    appointment: appointment._id,
    status: 'IN_PROGRESS',
  });

  if (!consultation) {
    consultation = new Consultation({
      appointment: appointment._id,
      patient: appointment.patient,
      doctor: doctorUser._id,
      startTime: new Date(),
      status: 'IN_PROGRESS',
    });
    await consultation.save();
  }

  // Recalculate remaining waiting queue
  await recalculateDepartmentQueue(queueEntry.department);

  // Emit socket event to notify dashboards and patient
  socketEmitter.emitPatientCalled(
    appointment.tokenNumber,
    doctorUser.name,
    queueEntry.department,
    doctorUser.department ? `${doctorUser.department} Consultation Room` : 'Consultation Room 1'
  );

  return { queueEntry, appointment, consultation };
};

/**
 * Complete a consultation
 */
const completeConsultation = async (queueEntryId, doctorUser, consultationData = {}) => {
  const queueEntry = await QueueEntry.findById(queueEntryId).populate('appointment');
  if (!queueEntry) {
    throw new Error('Queue entry not found');
  }

  const endTime = new Date();
  const startTime = queueEntry.consultationStartTime || queueEntry.updatedAt;
  const durationMinutes = Math.max(1, Math.round((endTime - new Date(startTime)) / (1000 * 60)));

  // Update queue entry
  queueEntry.status = 'COMPLETED';
  queueEntry.consultationEndTime = endTime;
  queueEntry.isPending = false;
  queueEntry.queuePosition = 0;
  queueEntry.estimatedWaitMinutes = 0;
  await queueEntry.save();

  // Update appointment
  const appointment = await Appointment.findById(queueEntry.appointment._id);
  appointment.status = 'COMPLETED';
  await appointment.save();

  // Update consultation record
  let consultation = await Consultation.findOne({
    appointment: appointment._id,
    doctor: doctorUser._id,
    status: 'IN_PROGRESS',
  });

  if (!consultation) {
    consultation = new Consultation({
      appointment: appointment._id,
      patient: appointment.patient,
      doctor: doctorUser._id,
      startTime: queueEntry.consultationStartTime || new Date(),
    });
  }

  consultation.endTime = endTime;
  consultation.durationMinutes = durationMinutes;
  consultation.status = 'COMPLETED';
  consultation.clinicalNotes = consultationData.clinicalNotes || consultation.clinicalNotes;
  consultation.diagnosisNotes = consultationData.diagnosisNotes || consultation.diagnosisNotes;
  consultation.vitals = consultationData.vitals || consultation.vitals;
  consultation.prescriptions = consultationData.prescriptions || consultation.prescriptions;
  consultation.recommendedFollowUp = consultationData.recommendedFollowUp || consultation.recommendedFollowUp;

  await consultation.save();

  // Recalculate remaining queue
  await recalculateDepartmentQueue(queueEntry.department);

  // Emit completed event
  socketEmitter.emitPatientCompleted(appointment.tokenNumber, queueEntry.department);

  return { queueEntry, appointment, consultation };
};

/**
 * Put a patient on hold / pending state
 */
const holdPatient = async (queueEntryId, doctorUser, holdData = {}) => {
  const { reason = 'Awaiting laboratory / imaging investigations', category = 'OTHER', notes = '' } = holdData;

  const queueEntry = await QueueEntry.findById(queueEntryId).populate('appointment');
  if (!queueEntry) {
    throw new Error('Queue entry not found');
  }

  queueEntry.status = 'PENDING';
  queueEntry.isPending = true;
  queueEntry.queuePosition = 0;
  queueEntry.pendingDetails = {
    heldByDoctor: doctorUser._id,
    reason,
    category,
    notes,
    heldAt: new Date(),
  };

  await queueEntry.save();

  // Update appointment
  const appointment = await Appointment.findById(queueEntry.appointment._id);
  appointment.status = 'PENDING';
  await appointment.save();

  // Recalculate remaining queue
  await recalculateDepartmentQueue(queueEntry.department);

  // Emit on hold event
  socketEmitter.emitPatientOnHold(appointment.tokenNumber, queueEntry.department, reason, category);

  return { queueEntry, appointment };
};

/**
 * Resume a pending patient back to active priority queue
 */
const resumePatient = async (queueEntryId, doctorUser) => {
  const queueEntry = await QueueEntry.findById(queueEntryId).populate('appointment');
  if (!queueEntry) {
    throw new Error('Queue entry not found');
  }

  if (!queueEntry.isPending && queueEntry.status !== 'PENDING') {
    throw new Error('This patient is not currently on hold');
  }

  queueEntry.status = 'WAITING';
  queueEntry.isPending = false;
  if (queueEntry.pendingDetails) {
    queueEntry.pendingDetails.resumedAt = new Date();
  }

  await queueEntry.save();

  // Update appointment
  const appointment = await Appointment.findById(queueEntry.appointment._id);
  appointment.status = 'WAITING';
  await appointment.save();

  // Recalculate priority with pending return boost
  await updateAppointmentPriority(appointment._id, true);

  // Recalculate queue
  await recalculateDepartmentQueue(queueEntry.department);

  return { queueEntry, appointment };
};

/**
 * Get sanitized public patient tracking information by tokenNumber
 */
const getPublicPatientStatus = async (tokenNumber) => {
  const appointment = await Appointment.findOne({ tokenNumber })
    .populate('patient', 'name')
    .populate('assignedDoctor', 'name department');

  if (!appointment) return null;

  const queueEntry = await QueueEntry.findOne({ appointment: appointment._id });

  // Get active queue summary in this department
  const totalWaitingInDept = await QueueEntry.countDocuments({
    department: appointment.department,
    status: 'WAITING',
    isPending: false,
  });

  const currentServingEntry = await QueueEntry.findOne({
    department: appointment.department,
    status: 'IN_CONSULTATION',
  }).populate('appointment', 'tokenNumber');

  return {
    tokenNumber: appointment.tokenNumber,
    department: appointment.department,
    appointmentDate: appointment.appointmentDate,
    status: appointment.status,
    queuePosition: queueEntry ? queueEntry.queuePosition : null,
    estimatedWaitMinutes: queueEntry ? queueEntry.estimatedWaitMinutes : appointment.initialEstimatedWaitMinutes,
    priorityLevel: queueEntry ? queueEntry.priorityLevel : 'PENDING_TRIAGE',
    isPending: queueEntry ? queueEntry.isPending : false,
    pendingReason: queueEntry?.isPending ? queueEntry.pendingDetails?.reason : null,
    assignedDoctor: appointment.assignedDoctor ? appointment.assignedDoctor.name : null,
    departmentQueueStats: {
      totalWaiting: totalWaitingInDept,
      currentServingToken: currentServingEntry?.appointment?.tokenNumber || 'None in consultation',
    },
    lastUpdated: new Date(),
  };
};

/**
 * Get general queue statistics
 */
const getQueueStats = async (department = null) => {
  const filter = department ? { department } : {};

  const [totalWaiting, totalInConsultation, totalPending, totalCompleted] = await Promise.all([
    QueueEntry.countDocuments({ ...filter, status: 'WAITING', isPending: false }),
    QueueEntry.countDocuments({ ...filter, status: 'IN_CONSULTATION' }),
    QueueEntry.countDocuments({ ...filter, status: 'PENDING' }),
    QueueEntry.countDocuments({ ...filter, status: 'COMPLETED' }),
  ]);

  const priorityCounts = await QueueEntry.aggregate([
    { $match: { ...filter, status: 'WAITING', isPending: false } },
    { $group: { _id: '$priorityLevel', count: { $sum: 1 } } },
  ]);

  const breakdown = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  priorityCounts.forEach((item) => {
    if (breakdown[item._id] !== undefined) {
      breakdown[item._id] = item.count;
    }
  });

  return {
    totalWaiting,
    totalInConsultation,
    totalPending,
    totalCompleted,
    priorityBreakdown: breakdown,
  };
};

module.exports = {
  recalculateDepartmentQueue,
  updateAppointmentPriority,
  startConsultation,
  completeConsultation,
  holdPatient,
  resumePatient,
  getPublicPatientStatus,
  getQueueStats,
};
