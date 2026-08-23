const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  getDoctors,
  registerValidation,
  loginValidation,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.get('/me', protect, getMe);
router.get('/doctors', protect, getDoctors);

module.exports = router;
