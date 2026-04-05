// utils/iotSimulator.js
// Simulates ESP32 sensor sending live data every 30 seconds

const logger = require('./logger');

let tick = 0;

function generateReading() {
  tick++;
  // Create realistic oscillating sensor values
  const moisture = Math.round(32 + Math.sin(tick * 0.3) * 12 + (Math.random() - 0.5) * 4);
  const temp     = Math.round(31 + Math.sin(tick * 0.1) * 5 + (Math.random() - 0.5) * 2);
  const humidity = Math.round(62 + Math.cos(tick * 0.2) * 14 + (Math.random() - 0.5) * 3);
  const ph       = Math.round((6.7 + Math.sin(tick * 0.05) * 0.4) * 10) / 10;
  const ec       = Math.round((1.9 + Math.random() * 0.4) * 10) / 10;
  const nitrogens = ['medium', 'medium', 'high', 'medium', 'low'];
  const nitrogen = nitrogens[tick % nitrogens.length];

  return {
    soilMoisture: Math.max(15, Math.min(85, moisture)),
    soilPH: Math.max(5.5, Math.min(8.0, ph)),
    temperature: Math.max(22, Math.min(44, temp)),
    humidity: Math.max(35, Math.min(92, humidity)),
    ecLevel: Math.max(0.8, Math.min(3.5, ec)),
    nitrogen
  };
}

function buildAlerts(readings) {
  const alerts = [];
  if (readings.soilMoisture < 30) {
    alerts.push({ type: 'low_moisture', severity: 'critical', message: `Soil moisture critically low: ${readings.soilMoisture}%. Start irrigation now!` });
  } else if (readings.soilMoisture < 40) {
    alerts.push({ type: 'low_moisture', severity: 'warning', message: `Soil moisture low: ${readings.soilMoisture}%. Consider irrigation.` });
  }
  if (readings.temperature > 38) {
    alerts.push({ type: 'high_temp', severity: 'warning', message: `High temperature ${readings.temperature}°C. Risk of crop heat stress.` });
  }
  if (readings.soilPH < 5.8 || readings.soilPH > 7.5) {
    alerts.push({ type: 'ph_imbalance', severity: 'warning', message: `pH ${readings.soilPH} outside optimal range.` });
  }
  if (readings.humidity > 82 && readings.temperature > 28) {
    alerts.push({ type: 'pest_risk', severity: 'warning', message: `High humidity + temp = fungal risk. Inspect crops.` });
  }
  return alerts;
}

function startIoTSimulator(io) {
  const INTERVAL = parseInt(process.env.IOT_UPDATE_INTERVAL) || 30000;

  logger.info(`🌡️  IoT Simulator: Broadcasting every ${INTERVAL / 1000}s`);

  setInterval(() => {
    const readings = generateReading();
    const alerts = buildAlerts(readings);
    const pumpStatus = readings.soilMoisture < 30;

    const payload = {
      farmId: 'demo_farm_001',
      deviceId: 'ESP32_DEMO_01',
      zone: tick % 4 === 0 ? 'Zone 2' : 'Zone 1',
      readings,
      alerts,
      pumpStatus,
      cropHealth: Math.round(60 + (readings.soilMoisture - 30) * 0.8 + (8 - Math.abs(readings.soilPH - 7)) * 5),
      timestamp: new Date().toISOString()
    };

    // Broadcast to ALL connected clients
    io.emit('sensor_update', payload);

    // Also broadcast to farm-specific room
    io.to('farm_demo_farm_001').emit('sensor_update', payload);

    logger.info(`📡 IoT broadcast: moisture=${readings.soilMoisture}% temp=${readings.temperature}°C alerts=${alerts.length}`);
  }, INTERVAL);
}

module.exports = { startIoTSimulator };
