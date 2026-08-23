const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Log sensitive hospital and clinical workflow actions
 */
const recordAuditLog = async ({
  user = null,
  userName = 'Anonymous/System',
  userRole = 'SYSTEM',
  action,
  targetType,
  targetId = null,
  details = {},
  ipAddress = '',
  userAgent = '',
}) => {
  try {
    const log = new AuditLog({
      user: user ? (user._id || user) : undefined,
      userName: user ? (user.name || userName) : userName,
      userRole: user ? (user.role || userRole) : userRole,
      action,
      targetType,
      targetId: targetId ? targetId.toString() : undefined,
      details,
      ipAddress,
      userAgent,
    });

    await log.save();
    logger.debug(`[Audit Log] ${action} on ${targetType} ${targetId || ''} by ${userRole}`);
    return log;
  } catch (error) {
    logger.error(`[Audit Log Error] Failed to write audit log: ${error.message}`);
    return null;
  }
};

module.exports = {
  recordAuditLog,
};
