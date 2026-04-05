const jwt = require('jsonwebtoken');
const { User } = require('../models');

// ── Protect routes (must be logged in) ──
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authorized. Please login.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User no longer exists.' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Token invalid or expired. Please login again.' });
  }
};

// ── Authorize by role ──
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Role '${req.user.role}' is not authorized for this action.`
      });
    }
    next();
  };
};

// ── Generate JWT Token ──
exports.generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};
