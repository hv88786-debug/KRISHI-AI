const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  deviceId:    { type: String, required: true },  // ESP32 device ID
  farmerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  zone:        { type: String, default: 'Zone-1' },

  // Soil readings
  soilMoisture:  { type: Number },  // %
  soilPH:        { type: Number },  // 0-14
  soilEC:        { type: Number },  // mS/cm
  nitrogen:      { type: String },  // Low / Medium / High
  phosphorus:    { type: String },
  potassium:     { type: String },

  // Ambient
  temperature:   { type: Number },  // °C
  humidity:      { type: Number },  // %

  // Weather API data (Open-Meteo — free)
  weatherTemp:     { type: Number },
  weatherHumidity: { type: Number },
  weatherRain:     { type: Number, default: 0 },
  weatherReady:    { type: Boolean, default: false },

  // Crop info from ESP32
  cropType:        { type: String, default: 'Wheat' },
  cropMinMoisture: { type: Number },
  cropMaxMoisture: { type: Number },
  cropIdealTemp:   { type: Number },
  cropSeason:      { type: String },
  manualMode:      { type: Boolean, default: false },

  // Pump status
  pumpStatus:    { type: Boolean, default: false },
  irrigationDuration: { type: Number, default: 0 }, // minutes

  // AI decision
  aiDecision:    { type: String },   // e.g. "Irrigate Zone 1"
  alertLevel:    { type: String, enum: ['ok', 'warning', 'critical'], default: 'ok' },
  alerts:        [{ type: String }],

  timestamp:     { type: Date, default: Date.now },
}, { timestamps: false });

// Index for fast queries by device + time
sensorDataSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('SensorData', sensorDataSchema);
