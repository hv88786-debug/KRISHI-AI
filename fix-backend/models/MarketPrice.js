const mongoose = require('mongoose');

const marketPriceSchema = new mongoose.Schema({
  crop:       { type: String, required: true },
  variety:    { type: String },
  category:   { type: String, enum: ['cereal','veg','pulse','oilseed','spice'] },
  mandi:      { type: String, required: true },
  district:   { type: String },
  state:      { type: String, default: 'Rajasthan' },

  minPrice:   { type: Number },
  maxPrice:   { type: Number },
  modalPrice: { type: Number, required: true },
  unit:       { type: String, default: 'quintal' },

  priceDate:  { type: Date, default: Date.now },
  source:     { type: String, default: 'APMC' },
}, { timestamps: true });

marketPriceSchema.index({ crop: 1, priceDate: -1 });
marketPriceSchema.index({ mandi: 1, priceDate: -1 });

module.exports = mongoose.model('MarketPrice', marketPriceSchema);
