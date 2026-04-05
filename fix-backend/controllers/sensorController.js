const SensorData = require('../models/SensorData');

// ─── RECEIVE DATA FROM ESP32 ──────────────────
const receiveSensorData = async (req, res, next) => {
  try {
    const body = req.body;

    if (!body.deviceId)
      return res.status(400).json({ success: false, message: 'deviceId required' });

    const deviceId   = body.deviceId;
    const zone       = body.zone       || 'Zone-1';
    const farmerId   = body.farmerId   || null;

    // Accept both short names (ESP32 sends: soil, temp, pump)
    // AND full names (soilMoisture, temperature, pumpStatus)
    const soilMoisture  = body.soilMoisture  ?? body.soil     ?? body.moisture ?? null;
    const temperature   = body.temperature   ?? body.temp     ?? body.dhtTemp  ?? null;
    const humidity      = body.humidity      ?? body.hum      ?? body.dhtHum   ?? null;
    const pumpStatus    = body.pumpStatus    ?? body.pump     ?? false;
    const soilPH        = body.soilPH        ?? body.ph       ?? null;
    const soilEC        = body.soilEC        ?? body.ec       ?? null;
    const nitrogen      = body.nitrogen      || 'Medium';
    const phosphorus    = body.phosphorus    || 'Medium';
    const potassium     = body.potassium     || 'Medium';

    // AI Decision Logic
    const alerts = [];
    let alertLevel = 'ok';
    let aiDecision = 'All parameters normal ✓';
    let irrigate = false;

    if (soilMoisture !== undefined) {
      if (soilMoisture < 20) {
        alerts.push('CRITICAL: Soil moisture very low — irrigate immediately');
        alertLevel = 'critical';
        aiDecision = `CRITICAL: Irrigate ${zone || 'Zone-1'} immediately`;
        irrigate = true;
      } else if (soilMoisture < 35) {
        alerts.push(`Low soil moisture (${soilMoisture}%) — irrigation needed`);
        alertLevel = 'warning';
        aiDecision = `Irrigate ${zone || 'Zone-1'} — moisture at ${soilMoisture}%`;
        irrigate = true;
      }
    }
    if (soilPH < 5.5) alerts.push(`Soil pH too acidic (${soilPH}) — apply lime`);
    if (soilPH > 7.5) alerts.push(`Soil pH too alkaline (${soilPH}) — apply sulfur`);
    if (soilEC > 2.5)  alerts.push(`EC level high (${soilEC} mS/cm) — reduce fertilizer`);
    if (temperature > 40) alerts.push(`High temperature stress (${temperature}°C)`);
    if (humidity < 40) alerts.push(`Low humidity (${humidity}%) — drought stress risk`);

    const data = await SensorData.create({
      deviceId, farmerId, zone,
      soilMoisture, soilPH, soilEC,
      nitrogen, phosphorus, potassium,
      temperature, humidity, pumpStatus,
      alertLevel, alerts, aiDecision,
      irrigationDuration: irrigate ? 45 : 0,
    });

    // Broadcast live sensor update to all dashboards via Socket.io
    if (global.io) {
      global.io.emit('sensor_update', {
        deviceId, zone,
        soilMoisture, soilPH, soilEC,
        temperature, humidity, pumpStatus,
        alertLevel, alerts, aiDecision,
        irrigate,
        ts: Date.now()
      });
    }

    // Check for pending manual pump command from website
    let pendingPump = null;
    if (global.pendingCommands?.[deviceId]?.length) {
      pendingPump = global.pendingCommands[deviceId].shift(); // pop oldest command
      if (global.pendingCommands[deviceId].length === 0)
        delete global.pendingCommands[deviceId];
      console.log(`📤 Sending queued pump command to ESP32: ${pendingPump.zone} → ${pendingPump.action}`);
    }

    res.status(201).json({
      success: true,
      message: 'Sensor data received',
      data,
      // Auto irrigation command
      command: {
        irrigate,
        duration: irrigate ? 45 : 0,
        // Manual pump override from website (if any)
        pumpOverride: pendingPump ? {
          zone:   pendingPump.zone,
          action: pendingPump.action,   // 'on' | 'off' | 'auto'
          pump:   pendingPump.action === 'on',
        } : null
      }
    });
  } catch (err) { next(err); }
};

// ─── GET LATEST READING ───────────────────────
const getLatestReading = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const data = await SensorData.findOne({ deviceId }).sort({ timestamp: -1 });
    if (!data)
      return res.status(404).json({ success: false, message: 'No data for this device' });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ─── GET DASHBOARD SUMMARY ────────────────────
const getDashboard = async (req, res, next) => {
  try {
    const farmerId = req.user._id;

    const latest = await SensorData.aggregate([
      { $match: { farmerId } },
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$deviceId', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
    ]);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stats = await SensorData.aggregate([
      { $match: { farmerId, timestamp: { $gte: since } } },
      { $group: {
        _id: null,
        avgMoisture:   { $avg: '$soilMoisture' },
        avgTemp:       { $avg: '$temperature' },
        avgHumidity:   { $avg: '$humidity' },
        avgPH:         { $avg: '$soilPH' },
        totalReadings: { $sum: 1 },
      }},
    ]);

    const recentAlerts = await SensorData
      .find({ farmerId, alertLevel: { $ne: 'ok' } })
      .sort({ timestamp: -1 })
      .limit(10)
      .select('alerts alertLevel zone timestamp aiDecision');

    res.json({
      success: true,
      dashboard: {
        zones: latest,
        stats: stats[0] || {},
        recentAlerts,
        lastUpdated: latest[0]?.timestamp || null,
      }
    });
  } catch (err) { next(err); }
};

// ─── GET HISTORY (sparklines / charts) ────────
const getHistory = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const days = parseInt(req.query.days) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const history = await SensorData.aggregate([
      { $match: { deviceId, timestamp: { $gte: since } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        avgMoisture: { $avg: '$soilMoisture' },
        avgTemp:     { $avg: '$temperature' },
        avgPH:       { $avg: '$soilPH' },
        count:       { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]);

    res.json({ success: true, history });
  } catch (err) { next(err); }
};

// ─── PUMP CONTROL (from website toggle) ───────
// POST /api/sensor/pump/:deviceId
// Body: { zone: "Zone-1", action: "on" | "off" | "auto" }
const controlPump = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const { zone, action } = req.body;

    if (!zone || !action)
      return res.status(400).json({ success: false, message: 'zone and action required' });

    if (!['on', 'off', 'auto'].includes(action))
      return res.status(400).json({ success: false, message: 'action must be on | off | auto' });

    const command = { zone, action, ts: Date.now(), source: 'website' };

    // Check if ESP32 is online via Socket.io
    const deviceSocketId = global.connectedDevices?.[deviceId];

    if (deviceSocketId && global.io) {
      // Send command directly to the ESP32 socket
      global.io.to('device_' + deviceId).emit('pump_command', command);
      console.log(`💧 Pump command sent to ${deviceId}: ${zone} → ${action}`);

      return res.json({
        success: true,
        message: `Pump command sent to ESP32 (${deviceId}): Zone ${zone} → ${action.toUpperCase()}`,
        command,
        delivery: 'socket'
      });
    } else {
      // ESP32 is offline — store command, ESP32 will pick it up next time it POSTs data
      // Using a simple in-memory queue (replace with Redis for production)
      if (!global.pendingCommands) global.pendingCommands = {};
      if (!global.pendingCommands[deviceId]) global.pendingCommands[deviceId] = [];
      global.pendingCommands[deviceId].push(command);

      console.log(`💧 Pump command queued for offline device ${deviceId}: ${zone} → ${action}`);

      return res.json({
        success: true,
        message: `ESP32 is offline. Command queued — will execute when device reconnects.`,
        command,
        delivery: 'queued'
      });
    }
  } catch (err) { next(err); }
};

module.exports = {
  receiveSensorData,
  getLatestReading,
  getDashboard,
  getHistory,
  controlPump
};
