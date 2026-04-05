// ═══════════════════════════════════════════
// models/User.model.js
// ═══════════════════════════════════════════
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  phone: {
    type: String, required: true, unique: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian mobile number']
  },
  email: { type: String, sparse: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },
  role: { type: String, enum: ['farmer', 'admin', 'agent'], default: 'farmer' },
  profile: {
    village: String,
    district: String,
    state: { type: String, default: 'Rajasthan' },
    landHolding: Number,          // in hectares
    farmerCategory: {
      type: String,
      enum: ['marginal', 'small', 'medium', 'large'],
      default: 'small'
    },
    primaryCrop: String,
    aadhaarLinked: { type: Boolean, default: false }
  },
  farms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Farm' }],
  preferredLanguage: { type: String, default: 'hi', enum: ['hi', 'en', 'raj', 'har'] },
  isVerified: { type: Boolean, default: false },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now }
});

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ═══════════════════════════════════════════
// models/Farm.model.js
// ═══════════════════════════════════════════
const FarmSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, default: 'My Farm' },
  location: {
    village: String,
    district: { type: String, default: 'Ajmer' },
    state: { type: String, default: 'Rajasthan' },
    coordinates: { lat: Number, lng: Number }
  },
  area: { type: Number, required: true },   // hectares
  currentCrop: String,
  soilType: { type: String, enum: ['sandy', 'loamy', 'clay', 'black', 'red'], default: 'loamy' },
  zones: [{
    zoneId: String,
    name: String,
    area: Number,
    crop: String,
    pumpStatus: { type: Boolean, default: false }
  }],
  devices: [{
    deviceId: String,
    type: { type: String, enum: ['esp32', 'arduino', 'raspberry_pi'] },
    zone: String,
    isActive: { type: Boolean, default: true },
    lastSeen: Date
  }],
  createdAt: { type: Date, default: Date.now }
});

// ═══════════════════════════════════════════
// models/SensorReading.model.js
// ═══════════════════════════════════════════
const SensorReadingSchema = new mongoose.Schema({
  farm: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', required: true },
  deviceId: String,
  zone: { type: String, default: 'Zone 1' },
  readings: {
    soilMoisture: { type: Number, min: 0, max: 100 },  // %
    soilPH: { type: Number, min: 0, max: 14 },
    temperature: { type: Number },                        // Celsius
    humidity: { type: Number, min: 0, max: 100 },        // %
    ecLevel: { type: Number },                            // mS/cm
    nitrogen: { type: String, enum: ['low', 'medium', 'high'] },
    phosphorus: { type: String, enum: ['low', 'medium', 'high'] },
    potassium: { type: String, enum: ['low', 'medium', 'high'] },
    lightIntensity: Number                                // lux
  },
  alerts: [{
    type: { type: String, enum: ['low_moisture', 'high_temp', 'pest_risk', 'ph_imbalance', 'low_nutrients'] },
    severity: { type: String, enum: ['info', 'warning', 'critical'] },
    message: String
  }],
  pumpStatus: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

SensorReadingSchema.index({ farm: 1, timestamp: -1 });

// ═══════════════════════════════════════════
// models/DiseaseReport.model.js
// ═══════════════════════════════════════════
const DiseaseReportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  farm: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm' },
  imageUrl: { type: String, required: true },
  cropType: String,
  aiResult: {
    detected: Boolean,
    disease: String,
    confidence: Number,           // 0-100
    severity: { type: String, enum: ['none', 'mild', 'moderate', 'severe'] },
    treatment: String,
    preventionTips: [String],
    pesticide: String,
    dosage: String,
    sprayTime: String
  },
  status: { type: String, enum: ['pending', 'analyzed', 'treated'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

// ═══════════════════════════════════════════
// models/MarketPrice.model.js
// ═══════════════════════════════════════════
const MarketPriceSchema = new mongoose.Schema({
  crop: { type: String, required: true },
  cropHindi: String,
  category: { type: String, enum: ['cereal', 'veg', 'pulse', 'oilseed', 'spice'], required: true },
  variety: String,
  mandi: { type: String, required: true },
  district: String,
  state: { type: String, default: 'Rajasthan' },
  prices: {
    min: Number,
    max: Number,
    modal: Number,
    unit: { type: String, default: 'quintal' }
  },
  change: Number,                 // vs previous day
  changePercent: Number,
  forecast7Day: [Number],         // predicted prices for next 7 days
  bestSellDay: Number,            // index 0-6
  date: { type: Date, default: Date.now }
});

MarketPriceSchema.index({ crop: 1, mandi: 1, date: -1 });
MarketPriceSchema.index({ category: 1, date: -1 });

// ═══════════════════════════════════════════
// models/Scheme.model.js
// ═══════════════════════════════════════════
const SchemeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameHindi: String,
  ministry: String,
  category: {
    type: String,
    enum: ['central', 'state', 'subsidy', 'insurance', 'credit'],
    required: true
  },
  description: String,
  benefits: {
    amount: String,
    type: { type: String, enum: ['cash', 'subsidy', 'credit', 'service', 'insurance'] },
    details: String
  },
  eligibility: {
    farmerCategory: [String],     // ['marginal','small','medium','large']
    minLand: Number,
    maxLand: Number,
    maxIncome: Number,
    crops: [String],
    states: [String]
  },
  applicationUrl: String,
  deadline: Date,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// ═══════════════════════════════════════════
// models/VoiceCall.model.js
// ═══════════════════════════════════════════
const VoiceCallSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  phone: String,
  language: { type: String, default: 'hi' },
  duration: Number,               // seconds
  intent: { type: String, enum: ['disease', 'market', 'scheme', 'weather', 'irrigation', 'general'] },
  transcript: String,
  aiResponse: String,
  callSid: String,                // Twilio Call SID
  status: { type: String, enum: ['initiated', 'completed', 'failed'], default: 'initiated' },
  createdAt: { type: Date, default: Date.now }
});

// ── Export all models ──
const User = mongoose.model('User', UserSchema);
const Farm = mongoose.model('Farm', FarmSchema);
const SensorReading = mongoose.model('SensorReading', SensorReadingSchema);
const DiseaseReport = mongoose.model('DiseaseReport', DiseaseReportSchema);
const MarketPrice = mongoose.model('MarketPrice', MarketPriceSchema);
const Scheme = mongoose.model('Scheme', SchemeSchema);
const VoiceCall = mongoose.model('VoiceCall', VoiceCallSchema);

module.exports = { User, Farm, SensorReading, DiseaseReport, MarketPrice, Scheme, VoiceCall };
