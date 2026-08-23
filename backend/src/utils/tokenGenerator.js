const crypto = require('crypto');

/**
 * Generate unique, human-readable patient token numbers
 * Format: [PREFIX]-[YYYYMMDD]-[RANDOM_4_DIGIT]
 * E.g., TKN-20260822-4819 or EMG-20260822-9214
 */
const generateTokenNumber = (department = 'General', isAccident = false) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  let prefix = 'TKN';
  if (isAccident) {
    prefix = 'EMG';
  } else if (department) {
    const deptClean = department.trim().toUpperCase();
    if (deptClean.startsWith('CARD')) prefix = 'CRD';
    else if (deptClean.startsWith('ORTH')) prefix = 'ORT';
    else if (deptClean.startsWith('PEDI')) prefix = 'PED';
    else if (deptClean.startsWith('NEUR')) prefix = 'NEU';
    else if (deptClean.startsWith('EMER')) prefix = 'EMG';
    else if (deptClean.startsWith('DERM')) prefix = 'DER';
    else if (deptClean.startsWith('ENT')) prefix = 'ENT';
  }

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${randomNum}`;
};

module.exports = {
  generateTokenNumber,
};
