const express = require('express');
const router = express.Router();
const {
  bookAppointment,
  getPatientByToken,
  bookAppointmentValidation,
  tokenParamValidation,
} = require('../controllers/patientController');
const upload = require('../middleware/uploadMiddleware');
const validate = require('../middleware/validateMiddleware');

// Book appointment (supports multipart/form-data for optional image upload)
router.post(
  '/appointments',
  upload.single('medicalImage'),
  bookAppointmentValidation,
  validate,
  bookAppointment
);

// Track status by token number
router.get('/token/:tokenNumber', tokenParamValidation, validate, getPatientByToken);

module.exports = router;
