const express = require('express');
const router = express.Router();
const {
  runGroqTriage,
  getGroqAnalysis,
  receiveImageAnalysisResult,
  getImageAnalysis,
  imageResultValidation,
} = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

// Webhook endpoint for external PyTorch service (public / API key protected)
router.post('/image-analysis-result', imageResultValidation, validate, receiveImageAnalysisResult);

// Staff and doctor AI analysis routes
router.post('/analyze-triage/:appointmentId', protect, authorize('STAFF', 'DOCTOR'), runGroqTriage);
router.get('/analysis/:appointmentId', protect, authorize('STAFF', 'DOCTOR'), getGroqAnalysis);
router.get('/image-analysis/:appointmentId', protect, authorize('STAFF', 'DOCTOR'), getImageAnalysis);

module.exports = router;
