const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ─── REGISTER ────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, phone, password, email, state, district, village, landHolding, primaryCrop, farmerCategory } = req.body;

    if (await User.findOne({ phone }))
      return res.status(400).json({ success: false, message: 'Phone number already registered' });

    const user = await User.create({ name, phone, password, email, state, district, village, landHolding, primaryCrop, farmerCategory });

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to AgroGuardian.',
      token,
      user: { id: user._id, name: user.name, phone: user.phone, role: user.role },
    });
  } catch (err) { next(err); }
};

// ─── LOGIN ────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password)
      return res.status(400).json({ success: false, message: 'Phone and password required' });

    const user = await User.findOne({ phone }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = generateToken(user._id);
    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: { id: user._id, name: user.name, phone: user.phone, role: user.role },
    });
  } catch (err) { next(err); }
};

// ─── GET PROFILE ──────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

// ─── UPDATE PROFILE ───────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'email', 'district', 'village', 'landHolding', 'primaryCrop', 'farmerCategory'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, message: 'Profile updated', user });
  } catch (err) { next(err); }
};

module.exports = { register, login, getProfile, updateProfile };
