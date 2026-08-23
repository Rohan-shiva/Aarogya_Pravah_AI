let ioInstance = null;

const setSocketIO = (io) => {
  ioInstance = io;
};

const getSocketIO = () => {
  return ioInstance;
};

/**
 * Socket.IO event emitter helpers
 */
const socketEmitter = {
  /**
   * Broadcast new patient submission to staff dashboard
   */
  emitNewPatient: (appointment) => {
    if (!ioInstance) return;
    ioInstance.to('staff').emit('new_patient', {
      event: 'new_patient',
      appointment,
      timestamp: new Date(),
    });
  },

  /**
   * Broadcast verified patient to staff, doctor, and specific patient room
   */
  emitPatientVerified: (appointment, queueEntry) => {
    if (!ioInstance) return;
    // Broadcast to staff and doctor dashboards
    ioInstance.to('staff').to('doctor').to(`department:${appointment.department}`).emit('patient_verified', {
      event: 'patient_verified',
      appointmentId: appointment._id,
      tokenNumber: appointment.tokenNumber,
      department: appointment.department,
      queuePosition: queueEntry ? queueEntry.queuePosition : null,
      priorityLevel: queueEntry ? queueEntry.priorityLevel : null,
      timestamp: new Date(),
    });

    // Notify the individual patient's private room
    ioInstance.to(`patient:${appointment.tokenNumber}`).emit('patient_status_updated', {
      tokenNumber: appointment.tokenNumber,
      status: appointment.status,
      queuePosition: queueEntry ? queueEntry.queuePosition : null,
      estimatedWaitMinutes: queueEntry ? queueEntry.estimatedWaitMinutes : null,
      message: 'Your appointment has been verified by staff and placed into the priority queue.',
    });
  },

  /**
   * Broadcast priority score recalculation
   */
  emitPriorityUpdated: (tokenNumber, department, priorityData) => {
    if (!ioInstance) return;
    ioInstance.to('staff').to('doctor').to(`department:${department}`).emit('priority_updated', {
      event: 'priority_updated',
      tokenNumber,
      department,
      priorityData,
      timestamp: new Date(),
    });
  },

  /**
   * Broadcast complete department queue update
   */
  emitQueueUpdated: (department, queueList) => {
    if (!ioInstance) return;
    // Strip sensitive clinical notes before broadcasting if sent to public/patients
    ioInstance.to('staff').to('doctor').to(`department:${department}`).emit('queue_updated', {
      event: 'queue_updated',
      department,
      count: queueList.length,
      queue: queueList,
      timestamp: new Date(),
    });
  },

  /**
   * Broadcast doctor calling a patient for consultation
   */
  emitPatientCalled: (tokenNumber, doctorName, department, roomNumber = 'Room 1') => {
    if (!ioInstance) return;
    // Broadcast to department displays & staff/doctor rooms
    ioInstance.to('staff').to('doctor').to(`department:${department}`).emit('patient_called', {
      event: 'patient_called',
      tokenNumber,
      doctorName,
      department,
      roomNumber,
      timestamp: new Date(),
    });

    // Notify the private patient
    ioInstance.to(`patient:${tokenNumber}`).emit('patient_called', {
      event: 'patient_called',
      tokenNumber,
      doctorName,
      department,
      roomNumber,
      status: 'IN_CONSULTATION',
      message: `Doctor ${doctorName} has called your token ${tokenNumber}. Please proceed to ${roomNumber}.`,
    });
  },

  /**
   * Broadcast putting a patient on hold/pending
   */
  emitPatientOnHold: (tokenNumber, department, reason, category) => {
    if (!ioInstance) return;
    ioInstance.to('staff').to('doctor').to(`department:${department}`).emit('patient_on_hold', {
      event: 'patient_on_hold',
      tokenNumber,
      department,
      reason,
      category,
      timestamp: new Date(),
    });

    ioInstance.to(`patient:${tokenNumber}`).emit('patient_status_updated', {
      tokenNumber,
      status: 'PENDING',
      message: `Your consultation is temporarily on hold: ${reason}. You will receive top priority when ready to resume.`,
    });
  },

  /**
   * Broadcast consultation completion
   */
  emitPatientCompleted: (tokenNumber, department) => {
    if (!ioInstance) return;
    ioInstance.to('staff').to('doctor').to(`department:${department}`).emit('patient_completed', {
      event: 'patient_completed',
      tokenNumber,
      department,
      timestamp: new Date(),
    });

    ioInstance.to(`patient:${tokenNumber}`).emit('patient_status_updated', {
      tokenNumber,
      status: 'COMPLETED',
      message: 'Your consultation has been completed. Thank you for your patience.',
    });
  },

  /**
   * Targeted patient status update
   */
  emitPatientStatusUpdated: (tokenNumber, payload) => {
    if (!ioInstance) return;
    ioInstance.to(`patient:${tokenNumber}`).emit('patient_status_updated', {
      tokenNumber,
      ...payload,
      timestamp: new Date(),
    });
  },
};

module.exports = {
  setSocketIO,
  getSocketIO,
  socketEmitter,
};
