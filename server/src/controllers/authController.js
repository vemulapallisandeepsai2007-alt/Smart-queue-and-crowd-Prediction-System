const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Staff = require('../models/Staff');
const Place = require('../models/Place');
const Admin = require('../models/Admin');
const { JWT_SECRET } = require('../middleware/auth');

// Helper to sign JWT tokens
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

/**
 * POST /api/auth/user/signup
 * Register a citizen / patient / customer
 */
const userSignup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { name, phone, gender, dob, email, password, age } = req.body;

    // Check if phone number already exists
    const existingUser = await User.findOne({ phone: phone.trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this phone number already exists. Please sign in instead.',
      });
    }

    // Validate DOB is not in the future
    const parsedDob = new Date(dob);
    if (isNaN(parsedDob.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid date of birth.',
      });
    }
    if (parsedDob > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Date of birth cannot be in the future.',
      });
    }

    const { calculateAgeFromDOB } = require('../models/User');
    const finalAge =
      age !== undefined && age !== null && age !== ''
        ? Number(age)
        : calculateAgeFromDOB(parsedDob);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      name: name.trim(),
      phone: phone.trim(),
      gender,
      dob: parsedDob,
      age: finalAge,
      email: email ? email.trim().toLowerCase() : undefined,
      passwordHash,
    });

    await user.save();

    // Generate JWT
    const token = generateToken({
      id: user._id,
      role: 'user',
      phone: user.phone,
      name: user.name,
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: user.toJSON(),
      role: 'user',
    });
  } catch (error) {
    console.error('Error in userSignup:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during user signup.',
    });
  }
};

/**
 * POST /api/auth/user/login
 * User login with 10-digit phone and password
 */
const userLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { phone, password } = req.body;
    const cleanPhone = phone.trim();

    const user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password.',
      });
    }

    const token = generateToken({
      id: user._id,
      role: 'user',
      phone: user.phone,
      name: user.name,
    });

    return res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: user.toJSON(),
      role: 'user',
    });
  } catch (error) {
    console.error('Error in userLogin:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during user login.',
    });
  }
};

/**
 * POST /api/auth/staff/signup
 * Register a hospital/bank staff member (status defaults to 'pending')
 */
const staffSignup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { category, name, staffId, email, phone, password, place } = req.body;
    const cleanStaffId = staffId.trim().toUpperCase();

    // Verify place exists
    const placeDoc = await Place.findById(place);
    if (!placeDoc) {
      return res.status(400).json({
        success: false,
        message: 'Selected facility was not found. Please choose a valid hospital or bank.',
      });
    }

    // Check existing staffId
    const existingStaff = await Staff.findOne({ staffId: cleanStaffId });
    if (existingStaff) {
      return res.status(400).json({
        success: false,
        message: 'A staff member with this Staff ID already exists.',
      });
    }

    // Check existing phone
    const existingPhone = await Staff.findOne({ phone: phone.trim() });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'A staff account with this phone number already exists.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const staff = new Staff({
      category,
      name: name.trim(),
      staffId: cleanStaffId,
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      passwordHash,
      status: 'pending', // Default pending admin review
      place: placeDoc._id,
      department: null,
    });

    await staff.save();

    return res.status(201).json({
      success: true,
      message: 'Staff registration submitted successfully. Your account is waiting for admin approval before you can log in.',
      staff: staff.toJSON(),
      status: 'pending',
    });
  } catch (error) {
    console.error('Error in staffSignup:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during staff signup.',
    });
  }
};

/**
 * POST /api/auth/staff/login
 * Staff login with staffId and password
 * Enforces status checks: pending or rejected
 */
const staffLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { staffId, password } = req.body;
    const cleanStaffId = staffId.trim().toUpperCase();

    const staff = await Staff.findOne({ staffId: cleanStaffId })
      .populate('place', 'name category city address')
      .populate('department', 'name');

    if (!staff) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Staff ID or password.',
      });
    }

    const isMatch = await bcrypt.compare(password, staff.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Staff ID or password.',
      });
    }

    // Status enforcement as required:
    // pending = "Your account is waiting for admin approval"
    // rejected = "Your request was rejected"
    // deactivated = "Your account has been deactivated. Please contact the administrator."
    if (staff.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'Your account is waiting for admin approval',
        status: 'pending',
      });
    }

    if (staff.status === 'rejected') {
      return res.status(403).json({
        success: false,
        message: 'Your request was rejected',
        status: 'rejected',
      });
    }

    if (staff.status === 'deactivated') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact the administrator.',
        status: 'deactivated',
      });
    }

    if (staff.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active. Please contact the administrator.',
        status: staff.status,
      });
    }

    // Approved: generate token
    const token = generateToken({
      id: staff._id,
      role: 'staff',
      staffId: staff.staffId,
      name: staff.name,
      category: staff.category,
    });

    return res.json({
      success: true,
      message: 'Staff login successful!',
      token,
      staff: staff.toJSON(),
      role: 'staff',
    });
  } catch (error) {
    console.error('Error in staffLogin:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during staff login.',
    });
  }
};

/**
 * POST /api/auth/admin/login
 * Admin login with username and password
 */
const adminLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { username, password } = req.body;
    const cleanUsername = username.trim().toLowerCase();

    const admin = await Admin.findOne({ username: cleanUsername });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials.',
      });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials.',
      });
    }

    const token = generateToken({
      id: admin._id,
      role: 'admin',
      username: admin.username,
    });

    return res.json({
      success: true,
      message: 'Admin authenticated successfully!',
      token,
      admin: admin.toJSON(),
      role: 'admin',
    });
  } catch (error) {
    console.error('Error in adminLogin:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during admin login.',
    });
  }
};

/**
 * GET /api/auth/me
 * Returns current authenticated profile by role
 */
const getMe = async (req, res) => {
  try {
    const { id, role } = req.user;

    let profile = null;

    if (role === 'user') {
      profile = await User.findById(id);
    } else if (role === 'staff') {
      profile = await Staff.findById(id)
        .populate('place')
        .populate('department', 'name');
    } else if (role === 'admin') {
      profile = await Admin.findById(id);
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found.',
      });
    }

    return res.json({
      success: true,
      user: profile.toJSON(),
      role,
    });
  } catch (error) {
    console.error('Error in getMe:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching user profile.',
    });
  }
};

module.exports = {
  userSignup,
  userLogin,
  staffSignup,
  staffLogin,
  adminLogin,
  getMe,
};
