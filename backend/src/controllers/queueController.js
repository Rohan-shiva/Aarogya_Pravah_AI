const { QueueEntry } = require('../models/QueueEntry');
const { Appointment } = require('../models/Appointment');
const {
  recalculateDepartmentQueue,
  getQueueStats,
  getPublicPatientStatus,
} = require('../services/queueService');
const ApiResponse = require('../utils/apiResponse');

/**
 * @route   GET /api/queue
 * @desc    Get active waiting queue with filters
 * @access  Public / Authenticated
 */
const getActiveQueue = async (req, res, next) => {
  try {
    const { department, status = 'WAITING', priorityLevel } = req.query;

    const filter = {};
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (priorityLevel) filter.priorityLevel = priorityLevel;

    // By default, exclude pending if status is WAITING
    if (status === 'WAITING') {
      filter.isPending = false;
    }

    const queue = await QueueEntry.find(filter)
      .populate('appointment', 'tokenNumber department symptoms reportedSeverity staffSeverity isAccident accidentSeverity status appointmentDate')
      .populate('patient', 'name age gender phoneNumber')
      .populate('assignedDoctor', 'name specialization')
      .sort({ priorityScore: -1, checkInTime: 1 });

    return ApiResponse.success(res, 'Active queue retrieved', {
      count: queue.length,
      queue,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/queue/stats
 * @desc    Get aggregated queue metrics and priority distribution
 * @access  Public / Authenticated
 */
const getQueueStatistics = async (req, res, next) => {
  try {
    const { department } = req.query;
    const stats = await getQueueStats(department);
    return ApiResponse.success(res, 'Queue statistics retrieved', stats);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/queue/recalculate
 * @desc    Trigger dynamic queue recalculation and re-sorting
 * @access  Private (Staff, Doctor)
 */
const triggerQueueRecalculation = async (req, res, next) => {
  try {
    const { department = 'General Medicine' } = req.body;

    const updatedQueue = await recalculateDepartmentQueue(department);

    return ApiResponse.success(res, `Queue successfully recalculated for ${department}`, {
      department,
      activeWaitingCount: updatedQueue.length,
      queue: updatedQueue,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/queue/position/:tokenNumber
 * @desc    Get queue position and estimated waiting time for token
 * @access  Public
 */
const getQueuePositionByToken = async (req, res, next) => {
  try {
    const { tokenNumber } = req.params;
    const patientStatus = await getPublicPatientStatus(tokenNumber);

    if (!patientStatus) {
      return ApiResponse.notFound(res, `No appointment found with token: ${tokenNumber}`);
    }

    return ApiResponse.success(res, 'Queue position retrieved', {
      tokenNumber: patientStatus.tokenNumber,
      status: patientStatus.status,
      queuePosition: patientStatus.queuePosition,
      estimatedWaitMinutes: patientStatus.estimatedWaitMinutes,
      priorityLevel: patientStatus.priorityLevel,
      departmentQueueStats: patientStatus.departmentQueueStats,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActiveQueue,
  getQueueStatistics,
  triggerQueueRecalculation,
  getQueuePositionByToken,
};
