const mongoose = require('mongoose');

const schemeApplicationSchema = new mongoose.Schema({
  farmerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  schemeName: { type: String, required: true },
  schemeCode: { type: String },
  ministry:   { type: String },

  // Farmer details at time of application
  landHolding:    { type: Number },
  farmerCategory: { type: String },
  primaryCrop:    { type: String },
  annualIncome:   { type: String },

  status: {
    type: String,
    enum: ['submitted', 'under_review', 'approved', 'rejected'],
    default: 'submitted'
  },
  remarks:    { type: String },
  submittedAt:{ type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('SchemeApplication', schemeApplicationSchema);
