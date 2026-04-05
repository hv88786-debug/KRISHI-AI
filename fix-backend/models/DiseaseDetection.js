const mongoose = require('mongoose');

const diseaseDetectionSchema = new mongoose.Schema({
  farmerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  imagePath:  { type: String, required: true },
  cropType:   { type: String },

  // AI Result
  detected:   { type: Boolean, default: false },
  disease:    { type: String },          // e.g. "Leaf Spot"
  confidence: { type: Number },          // 0-100
  severity:   { type: String, enum: ['none','mild','moderate','severe'] },

  // Treatment
  treatment:  { type: String },
  pesticide:  { type: String },
  dosage:     { type: String },

  // Status
  status:     { type: String, enum: ['pending','processed','failed'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('DiseaseDetection', diseaseDetectionSchema);
