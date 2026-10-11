const express = require('express');
const { body } = require('express-validator');
const {
  userSignup,
  userLogin,
  staffSignup,
  staffLogin,
  adminLogin,
  getMe,
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/rateLimiter');
const { calculateAgeFromDOB } = require('../models/User');

const router = express.Router();

// Validation Rules

// User Signup
const userSignupValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 80 })
    .withMessage('Name must be between 2 and 80 characters'),
  body('phone')
    .trim()
    .matches(/^\d{10}$/)
    .withMessage('Phone number must be exactly 10 digits'),
  body('gender')
    .trim()
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),
  body('dob')
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('Date of birth must be a valid date (YYYY-MM-DD)')
    .custom((value) => {
      if (new Date(value) > new Date()) {
        throw new Error('Date of birth cannot be in the future');
      }
      return true;
    }),
  body('age')
    .notEmpty()
    .withMessage('Age is required')
    .isInt({ min: 0, max: 120 })
    .withMessage('Age must be a number between 0 and 120')
    .toInt()
    .custom((ageVal, { req }) => {
      if (req.body.dob) {
        const expectedAge = calculateAgeFromDOB(req.body.dob);
        if (expectedAge !== null && ageVal !== expectedAge) {
          throw new Error(`Age (${ageVal}) does not match the provided Date of Birth (${expectedAge})`);
        }
      }
      return true;
    }),
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Invalid email format'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

// User Login
const userLoginValidation = [
  body('phone')
    .trim()
    .matches(/^\d{10}$/)
    .withMessage('Phone number must be exactly 10 digits'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Staff Signup
const staffSignupValidation = [
  body('category')
    .trim()
    .isIn(['Hospital', 'Bank'])
    .withMessage('Category must be either Hospital or Bank'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Staff name is required')
    .isLength({ min: 2, max: 80 })
    .withMessage('Staff name must be between 2 and 80 characters'),
  body('staffId')
    .trim()
    .notEmpty()
    .withMessage('Staff ID is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Staff ID must be between 3 and 30 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required'),
  body('phone')
    .trim()
    .matches(/^\d{10}$/)
    .withMessage('Phone number must be exactly 10 digits'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('place')
    .notEmpty()
    .withMessage('Hospital or Bank facility selection is required')
    .isMongoId()
    .withMessage('Invalid facility ID format'),
];

// Staff Login
const staffLoginValidation = [
  body('staffId')
    .trim()
    .notEmpty()
    .withMessage('Staff ID is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Admin Login
const adminLoginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Routes
router.post('/user/signup', userSignupValidation, userSignup);
router.post('/user/login', loginRateLimiter, userLoginValidation, userLogin);

router.post('/staff/signup', staffSignupValidation, staffSignup);
router.post('/staff/login', loginRateLimiter, staffLoginValidation, staffLogin);

router.post('/admin/login', loginRateLimiter, adminLoginValidation, adminLogin);

router.get('/me', authenticateToken, getMe);

module.exports = router;
