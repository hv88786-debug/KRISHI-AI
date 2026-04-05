const mongoose = require('mongoose');

const diseaseReportSchema = new mongoose.Schema({
  farmerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl:    { type: String, required: true },
  cropName:    { type: String, default: 'Unknown' },
  // AI result
  detected:    { type: Boolean, default: false },
  diseaseName: { type: String, default: 'Healthy' },
  confidence:  { type: Number, default: 0 },    // 0-100
  severity:    { type: String, enum: ['none','low','medium','high','critical'], default: 'none' },
  treatment: {
    chemical:  [String],
    organic:   [String],
    dosage:    { type: String, default: '' },
    frequency: { type: String, default: '' }
  },
  preventions: [String],
  rawApiResponse: { type: mongoose.Schema.Types.Mixed },
  createdAt:   { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('DiseaseReport', diseaseReportSchema);
