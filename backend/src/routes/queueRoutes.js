const express = require('express');
const router = express.Router();
const {
  getActiveQueue,
  getQueueStatistics,
  triggerQueueRecalculation,
  getQueuePositionByToken,
} = require('../controllers/queueController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', getActiveQueue);
router.get('/stats', getQueueStatistics);
router.get('/position/:tokenNumber', getQueuePositionByToken);
router.post('/recalculate', protect, authorize('STAFF', 'DOCTOR'), triggerQueueRecalculation);

module.exports = router;
