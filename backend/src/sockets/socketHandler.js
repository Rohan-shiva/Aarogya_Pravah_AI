const logger = require('../utils/logger');
const { setSocketIO } = require('./socketEmitter');

const initSocketIO = (io) => {
  setSocketIO(io);

  io.on('connection', (socket) => {
    logger.info(`[Socket.IO] New client connected: ${socket.id}`);

    // Patient joins their private token room
    socket.on('join_patient', (data) => {
      const tokenNumber = typeof data === 'string' ? data : data?.tokenNumber;
      if (tokenNumber) {
        socket.join(`patient:${tokenNumber}`);
        logger.debug(`[Socket.IO] Socket ${socket.id} joined room: patient:${tokenNumber}`);
        socket.emit('joined_room', { room: `patient:${tokenNumber}`, success: true });
      }
    });

    // Staff joins staff dashboard room
    socket.on('join_staff', () => {
      socket.join('staff');
      logger.debug(`[Socket.IO] Socket ${socket.id} joined staff room`);
      socket.emit('joined_room', { room: 'staff', success: true });
    });

    // Doctor joins doctor dashboard room
    socket.on('join_doctor', (data) => {
      socket.join('doctor');
      const doctorId = typeof data === 'string' ? data : data?.doctorId;
      if (doctorId) {
        socket.join(`doctor:${doctorId}`);
        logger.debug(`[Socket.IO] Socket ${socket.id} joined doctor:${doctorId}`);
      }
      logger.debug(`[Socket.IO] Socket ${socket.id} joined general doctor room`);
      socket.emit('joined_room', { room: 'doctor', success: true });
    });

    // Department room subscription
    socket.on('join_department', (data) => {
      const department = typeof data === 'string' ? data : data?.department;
      if (department) {
        socket.join(`department:${department}`);
        logger.debug(`[Socket.IO] Socket ${socket.id} joined department:${department}`);
        socket.emit('joined_room', { room: `department:${department}`, success: true });
      }
    });

    // Leave patient room
    socket.on('leave_patient', (data) => {
      const tokenNumber = typeof data === 'string' ? data : data?.tokenNumber;
      if (tokenNumber) {
        socket.leave(`patient:${tokenNumber}`);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = initSocketIO;
