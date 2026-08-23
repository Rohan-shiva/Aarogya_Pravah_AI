const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const { recordAuditLog } = require('../services/auditService');

/**
 * Generate JWT token
 */
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'super_secret_smart_queue_jwt_key_hackathon_2026_change_in_production',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new Hospital Staff or Doctor
 * @access  Public (or protected by admin in enterprise mode)
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, department, specialization, phoneNumber } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return ApiResponse.conflict(res, 'A user with this email address already exists.');
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role.toUpperCase(),
      department: department || 'General Medicine',
      specialization,
      phoneNumber,
    });

    const token = generateToken(user._id);

    await recordAuditLog({
      user,
      action: 'USER_REGISTERED',
      targetType: 'USER',
      targetId: user._id,
      details: { role: user.role, email: user.email, department: user.department },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return ApiResponse.created(res, 'User registered successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        specialization: user.specialization,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login Staff or Doctor
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return ApiResponse.unauthorized(res, 'Invalid email or password.');
    }

    if (!user.isActive) {
      return ApiResponse.forbidden(res, 'Your account has been deactivated. Please contact an administrator.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return ApiResponse.unauthorized(res, 'Invalid email or password.');
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    await recordAuditLog({
      user,
      action: 'USER_LOGIN',
      targetType: 'USER',
      targetId: user._id,
      details: { role: user.role, email: user.email },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return ApiResponse.success(res, 'Login successful', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        specialization: user.specialization,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user profile
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    return ApiResponse.success(res, 'User profile retrieved', { user: req.user });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/doctors
 * @desc    Get list of active doctors (for assignment/reference)
 * @access  Private (Staff, Doctor)
 */
const getDoctors = async (req, res, next) => {
  try {
    const { department } = req.query;
    const filter = { role: 'DOCTOR', isActive: true };
    if (department) filter.department = department;

    const doctors = await User.find(filter).select('name email department specialization');
    return ApiResponse.success(res, 'Active doctors retrieved', { doctors });
  } catch (error) {
    next(error);
  }
};

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['STAFF', 'DOCTOR']).withMessage('Role must be either STAFF or DOCTOR'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

module.exports = {
  register,
  login,
  getMe,
  getDoctors,
  registerValidation,
  loginValidation,
};
