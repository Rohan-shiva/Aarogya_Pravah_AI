/**
 * Simple structured console logger
 */

const logLevels = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
};

const formatMessage = (level, message, meta = null) => {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
};

const logger = {
  info: (message, meta) => console.log(formatMessage(logLevels.INFO, message, meta)),
  warn: (message, meta) => console.warn(formatMessage(logLevels.WARN, message, meta)),
  error: (message, meta) => console.error(formatMessage(logLevels.ERROR, message, meta)),
  debug: (message, meta) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatMessage(logLevels.DEBUG, message, meta));
    }
  },
};

module.exports = logger;
