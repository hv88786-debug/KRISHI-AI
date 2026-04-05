// ══════════════════════════════════════
// routes/sensor.routes.js
// ══════════════════════════════════════
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/sensor.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/live/:farmId', protect, ctrl.getLiveData);       // Latest reading
router.get('/history/:farmId', protect, ctrl.getHistory);     // Historical readings
router.post('/reading', ctrl.receiveReading);                 // ESP32 posts data here (no auth, uses deviceId)
router.post('/pump/:farmId', protect, ctrl.controlPump);      // Toggle pump
router.get('/alerts/:farmId', protect, ctrl.getAlerts);       // Active alerts

module.exports = router;

// ══════════════════════════════════════
// controllers/sensor.controller.js
// ══════════════════════════════════════
const { SensorReading, Farm } = require('../models');
const logger = require('../utils/logger');

// ── AI Decision Engine ──
function makeAIDecision(readings) {
  const alerts = [];
  let shouldIrrigate = false;

  const { soilMoisture, soilPH, temperature, humidity, ecLevel } = readings;

  // Moisture check
  if (soilMoisture < 30) {
    alerts.push({ type: 'low_moisture', severity: 'critical', message: `Soil moisture critically low at ${soilMoisture}%. Irrigation needed immediately.` });
    shouldIrrigate = true;
  } else if (soilMoisture < 40) {
    alerts.push({ type: 'low_moisture', severity: 'warning', message: `Soil moisture low at ${soilMoisture}%. Consider irrigation soon.` });
  }

  // Temperature check
  if (temperature > 40) {
    alerts.push({ type: 'high_temp', severity: 'warning', message: `High temperature ${temperature}°C detected. Risk of crop stress.` });
  }

  // pH check
  if (soilPH < 5.5 || soilPH > 7.5) {
    alerts.push({ type: 'ph_imbalance', severity: 'warning', message: `Soil pH ${soilPH} is outside optimal range (5.5–7.5). Apply lime or sulfur.` });
  }

  // EC check (salinity)
  if (ecLevel > 2.5) {
    alerts.push({ type: 'high_salinity', severity: 'warning', message: `EC level ${ecLevel} mS/cm is high. Leach excess salts with deep irrigation.` });
  }

  // Pest risk (simplified model)
  if (humidity > 80 && temperature > 28) {
    alerts.push({ type: 'pest_risk', severity: 'warning', message: `High humidity + temperature = fungal/pest risk. Inspect crops and consider preventive spray.` });
  }

  return { alerts, shouldIrrigate };
}

// @route GET /api/sensors/live/:farmId
exports.getLiveData = async (req, res) => {
  try {
    const latest = await SensorReading
      .findOne({ farm: req.params.farmId })
      .sort({ timestamp: -1 });

    if (!latest) {
      // Return simulated data for demo
      const simulated = generateSimulatedReading(req.params.farmId);
      return res.json({ success: true, source: 'simulated', data: simulated });
    }

    res.json({ success: true, source: 'sensor', data: latest });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @route GET /api/sensors/history/:farmId
exports.getHistory = async (req, res) => {
  try {
    const { hours = 24, zone } = req.query;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const query = { farm: req.params.farmId, timestamp: { $gte: since } };
    if (zone) query.zone = zone;

    const readings = await SensorReading.find(query).sort({ timestamp: -1 }).limit(200);

    // Aggregate for chart data
    const chartData = readings.map(r => ({
      time: r.timestamp,
      moisture: r.readings.soilMoisture,
      temp: r.readings.temperature,
      humidity: r.readings.humidity,
      ph: r.readings.soilPH
    }));

    res.json({ success: true, count: readings.length, chartData, readings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @route POST /api/sensors/reading (called by ESP32 device)
exports.receiveReading = async (req, res) => {
  try {
    const { deviceId, farmId, zone, soilMoisture, soilPH, temperature, humidity, ecLevel, nitrogen } = req.body;

    if (!farmId || !deviceId) {
      return res.status(400).json({ success: false, error: 'farmId and deviceId required' });
    }

    const readings = { soilMoisture, soilPH, temperature, humidity, ecLevel, nitrogen };
    const { alerts, shouldIrrigate } = makeAIDecision(readings);

    const sensorDoc = await SensorReading.create({
      farm: farmId,
      deviceId,
      zone: zone || 'Zone 1',
      readings,
      alerts,
      pumpStatus: shouldIrrigate,
      timestamp: new Date()
    });

    // Update device last seen
    await Farm.findByIdAndUpdate(farmId, {
      $set: { 'devices.$[d].lastSeen': new Date(), 'devices.$[d].isActive': true }
    }, { arrayFilters: [{ 'd.deviceId': deviceId }] });

    // Broadcast via Socket.IO to all clients watching this farm
    const io = req.app.get('io');
    if (io) {
      io.to(`farm_${farmId}`).emit('sensor_update', {
        farmId,
        zone,
        readings,
        alerts,
        pumpStatus: shouldIrrigate,
        timestamp: new Date()
      });
    }

    logger.info(`📡 Sensor reading from device ${deviceId}, farm ${farmId}`);

    res.json({
      success: true,
      message: 'Reading saved',
      alerts,
      command: shouldIrrigate ? 'START_PUMP' : 'NO_ACTION',
      readingId: sensorDoc._id
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @route POST /api/sensors/pump/:farmId
exports.controlPump = async (req, res) => {
  try {
    const { zone, action } = req.body; // action: 'start' | 'stop'
    const farm = await Farm.findById(req.params.farmId);
    if (!farm || farm.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Update zone pump status
    const zoneObj = farm.zones.find(z => z.name === zone || z.zoneId === zone);
    if (zoneObj) {
      zoneObj.pumpStatus = action === 'start';
      await farm.save();
    }

    // Broadcast pump status change
    const io = req.app.get('io');
    if (io) {
      io.to(`farm_${req.params.farmId}`).emit('pump_update', {
        zone, status: action === 'start', timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: `Pump ${action === 'start' ? '✅ started' : '⏹️ stopped'} for ${zone}`,
      pumpStatus: action === 'start'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @route GET /api/sensors/alerts/:farmId
exports.getAlerts = async (req, res) => {
  try {
    const recent = await SensorReading
      .find({ farm: req.params.farmId })
      .sort({ timestamp: -1 })
      .limit(5);

    const alerts = recent.flatMap(r => r.alerts || []);
    res.json({ success: true, count: alerts.length, alerts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Generate simulated sensor reading
function generateSimulatedReading(farmId) {
  const moisture = Math.round(28 + Math.random() * 30);
  const temp = Math.round(28 + Math.random() * 12);
  const humidity = Math.round(50 + Math.random() * 35);
  const ph = Math.round((6.0 + Math.random() * 1.5) * 10) / 10;
  const ec = Math.round((1.5 + Math.random() * 1.5) * 10) / 10;
  const readings = { soilMoisture: moisture, soilPH: ph, temperature: temp, humidity, ecLevel: ec, nitrogen: ['low','medium','high'][Math.floor(Math.random()*3)] };
  const { alerts, shouldIrrigate } = makeAIDecision(readings);
  return { farm: farmId, zone: 'Zone 1', readings, alerts, pumpStatus: shouldIrrigate, timestamp: new Date() };
}

// ══════════════════════════════════════
// utils/iotSimulator.js
// ══════════════════════════════════════
// Simulates ESP32 sending data every 30 seconds via WebSocket
const { SensorReading } = require('../models');

function generateReading() {
  const base = { moisture: 35, temp: 32, humidity: 62, ph: 6.8, ec: 1.8 };
  return {
    soilMoisture: Math.max(10, Math.min(90, base.moisture + (Math.random()-0.5)*10)),
    temperature: Math.max(20, Math.min(45, base.temp + (Math.random()-0.5)*6)),
    humidity: Math.max(30, Math.min(95, base.humidity + (Math.random()-0.5)*12)),
    soilPH: Math.max(5.0, Math.min(8.5, base.ph + (Math.random()-0.5)*0.4)),
    ecLevel: Math.max(0.5, Math.min(4.0, base.ec + (Math.random()-0.5)*0.3)),
    nitrogen: Math.random() > 0.5 ? 'medium' : 'high'
  };
}

function startIoTSimulator(io) {
  const DEMO_FARM_ID = 'demo_farm_001';
  const INTERVAL = parseInt(process.env.IOT_UPDATE_INTERVAL) || 30000;

  setInterval(() => {
    const readings = generateReading();
    const alerts = [];
    if (readings.soilMoisture < 30) alerts.push({ type:'low_moisture', severity:'warning', message:`Moisture low: ${Math.round(readings.soilMoisture)}%` });
    if (readings.temperature > 38) alerts.push({ type:'high_temp', severity:'warning', message:`High temp: ${Math.round(readings.temperature)}°C` });

    io.emit('sensor_update', {
      farmId: DEMO_FARM_ID,
      zone: 'Zone 1',
      readings: {
        soilMoisture: Math.round(readings.soilMoisture),
        soilPH: Math.round(readings.soilPH * 10) / 10,
        temperature: Math.round(readings.temperature),
        humidity: Math.round(readings.humidity),
        ecLevel: Math.round(readings.ecLevel * 10) / 10,
        nitrogen: readings.nitrogen
      },
      alerts,
      pumpStatus: readings.soilMoisture < 30,
      timestamp: new Date()
    });
  }, INTERVAL);
}

module.exports = { startIoTSimulator };
