const express = require('express');
const router = express.Router();
const {
  getPendingVerifications,
  getPatientDetails,
  verifyPatient,
  requestClarification,
  rejectPatient,
  updateSeverity,
  verifyValidation,
  clarificationValidation,
} = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

// All staff routes require authentication and STAFF or DOCTOR role
router.use(protect);
router.use(authorize('STAFF', 'DOCTOR'));

router.get('/pending-verifications', getPendingVerifications);
router.get('/patient/:id', getPatientDetails);
router.post('/verify/:id', verifyValidation, validate, verifyPatient);
router.post('/request-clarification/:id', clarificationValidation, validate, requestClarification);
router.post('/reject/:id', rejectPatient);
router.post('/update-severity/:id', updateSeverity);

module.exports = router;
