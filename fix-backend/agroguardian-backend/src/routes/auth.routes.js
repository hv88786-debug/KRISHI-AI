// ══════════════════════════════════════
// routes/auth.routes.js
// ══════════════════════════════════════
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid Indian mobile number required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], ctrl.register);

router.post('/login', [
  body('phone').notEmpty().withMessage('Phone is required'),
  body('password').notEmpty().withMessage('Password is required')
], ctrl.login);

router.get('/me', protect, ctrl.getMe);
router.put('/profile', protect, ctrl.updateProfile);
router.post('/logout', protect, ctrl.logout);

module.exports = router;

// ══════════════════════════════════════
// controllers/auth.controller.js
// ══════════════════════════════════════
const { validationResult } = require('express-validator');
const { User, Farm } = require('../models');
const { generateToken } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

// @route POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, phone, password, email, village, district, landHolding, primaryCrop } = req.body;

    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Phone number already registered' });
    }

    // Determine farmer category
    const land = parseFloat(landHolding) || 0;
    const farmerCategory = land < 1 ? 'marginal' : land <= 2 ? 'small' : land <= 10 ? 'medium' : 'large';

    const user = await User.create({
      name, phone, email, password,
      profile: { village, district: district || 'Ajmer', landHolding: land, farmerCategory, primaryCrop }
    });

    // Create a default farm for the user
    const farm = await Farm.create({
      owner: user._id,
      name: `${name}'s Farm`,
      location: { village, district: district || 'Ajmer' },
      area: land || 1,
      currentCrop: primaryCrop || 'Wheat',
      zones: [
        { zoneId: 'Z1', name: 'Zone 1', area: (land || 1) / 2, crop: primaryCrop || 'Wheat', pumpStatus: false },
        { zoneId: 'Z2', name: 'Zone 2', area: (land || 1) / 2, crop: primaryCrop || 'Wheat', pumpStatus: false }
      ]
    });

    user.farms.push(farm._id);
    await user.save();

    const token = generateToken(user._id);

    logger.info(`New farmer registered: ${phone}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to AgroGuardian.',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        profile: user.profile,
        farmId: farm._id
      }
    });
  } catch (err) {
    logger.error('Register error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// @route POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { phone, password } = req.body;

    const user = await User.findOne({ phone }).select('+password').populate('farms', 'name area location currentCrop');
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid phone number or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid phone number or password' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    logger.info(`Farmer logged in: ${phone}`);

    res.json({
      success: true,
      message: `Welcome back, ${user.name}! 🌱`,
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        profile: user.profile,
        farms: user.farms,
        preferredLanguage: user.preferredLanguage
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @route GET /api/auth/me
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id).populate('farms');
  res.json({ success: true, user });
};

// @route PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, village, district, landHolding, primaryCrop, preferredLanguage } = req.body;
    const update = {};
    if (name) update.name = name;
    if (email) update.email = email;
    if (preferredLanguage) update.preferredLanguage = preferredLanguage;
    if (village || district || landHolding || primaryCrop) {
      update['profile.village'] = village;
      update['profile.district'] = district;
      update['profile.landHolding'] = landHolding;
      update['profile.primaryCrop'] = primaryCrop;
    }
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @route POST /api/auth/logout
exports.logout = (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};
