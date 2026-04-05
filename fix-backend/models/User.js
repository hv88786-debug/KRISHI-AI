const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  phone:    { type: String, required: true, unique: true, trim: true },
  email:    { type: String, trim: true, lowercase: true },
  password: { type: String, required: true, minlength: 6, select: false },
  state:    { type: String, default: 'Rajasthan' },
  district: { type: String },
  village:  { type: String },
  landHolding: { type: Number },  // in hectares
  primaryCrop: { type: String },
  farmerCategory: {
    type: String,
    enum: ['marginal', 'small', 'medium', 'large'],
    default: 'small'
  },
  role: { type: String, enum: ['farmer', 'admin'], default: 'farmer' },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
