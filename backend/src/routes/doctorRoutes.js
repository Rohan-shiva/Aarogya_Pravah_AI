const express = require('express');
const router = express.Router();
const {
  getDoctorQueue,
  getPendingQueue,
  getPatientClinicalDetails,
  startPatientConsultation,
  completePatientConsultation,
  holdPatientInQueue,
  resumePatientToQueue,
  getDoctorHistory,
  startConsultationValidation,
  completeConsultationValidation,
  holdValidation,
} = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

// All doctor routes require authentication and DOCTOR role (or authorized staff)
router.use(protect);
router.use(authorize('DOCTOR', 'STAFF'));

router.get('/queue', getDoctorQueue);
router.get('/pending-queue', getPendingQueue);
router.get('/patient/:id', getPatientClinicalDetails);
router.post('/consultation/start', startConsultationValidation, validate, startPatientConsultation);
router.post('/consultation/complete', completeConsultationValidation, validate, completePatientConsultation);
router.post('/queue/hold', holdValidation, validate, holdPatientInQueue);
router.post('/queue/resume', startConsultationValidation, validate, resumePatientToQueue);
router.get('/history', getDoctorHistory);

module.exports = router;
