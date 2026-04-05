const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  ministry:    { type: String, required: true },
  category:    { type: String, enum: ['central','state','subsidy','insurance'], required: true },
  description: { type: String, required: true },
  benefits: {
    amount:    { type: String },
    subsidy:   { type: String },
    type:      { type: String }
  },
  eligibility: {
    farmerCategory: [String],   // ['marginal','small','medium','large']
    maxLand:        Number,
    minLand:        Number,
    states:         [String],
    crops:          [String],
    maxIncome:      Number
  },
  documents:   [String],
  deadline:    { type: String, default: 'Ongoing' },
  applyLink:   { type: String, default: '#' },
  isActive:    { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Scheme', schemeSchema);
