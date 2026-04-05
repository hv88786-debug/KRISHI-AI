const SensorData = require('../models/SensorData');

// ─── RECEIVE DATA FROM ESP32 IoT DEVICE ──────
const receiveSensorData = async (req, res, next) => {
  try {
    const { deviceId, zone, soilMoisture, soilPH, soilEC, nitrogen, phosphorus, potassium,
            temperature, humidity, pumpStatus, farmerId } = req.body;

    if (!deviceId) return res.status(400).json({ success: false, message: 'deviceId required' });

    // AI Decision Logic (rule-based, extend with ML model)
    const alerts = [];
    let alertLevel = 'ok';
    let aiDecision = 'All parameters normal ✓';
    let irrigate = false;

    if (soilMoisture < 30) {
      alerts.push('Low soil moisture — irrigation needed');
      alertLevel = 'warning';
      aiDecision = `Irrigate ${zone || 'Zone-1'} immediately`;
      irrigate = true;
    }
    if (soilMoisture < 20) { alertLevel = 'critical'; }
    if (soilPH < 5.5) alerts.push('Soil pH too acidic — apply lime');
    if (soilPH > 7.5) alerts.push('Soil pH too alkaline — apply sulfur');
    if (soilEC > 2.5) alerts.push('EC level high — reduce fertilizer');
    if (temperature > 40) alerts.push('High temperature stress detected');
    if (humidity < 40) alerts.push('Low humidity — check for drought stress');

    const data = await SensorData.create({
      deviceId, farmerId, zone,
      soilMoisture, soilPH, soilEC, nitrogen, phosphorus, potassium,
      temperature, humidity, pumpStatus, alertLevel, alerts, aiDecision,
      irrigationDuration: irrigate ? 45 : 0,
    });

    res.status(201).json({
      success: true,
      message: 'Sensor data received',
      data,
      command: { irrigate, duration: irrigate ? 45 : 0 }, // command back to ESP32
    });
  } catch (err) { next(err); }
};

// ─── GET LATEST SENSOR READING ────────────────
const getLatestReading = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const data = await SensorData.findOne({ deviceId }).sort({ timestamp: -1 });
    if (!data) return res.status(404).json({ success: false, message: 'No data found for this device' });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ─── GET DASHBOARD SUMMARY (all zones for farmer) ─
const getDashboard = async (req, res, next) => {
  try {
    const farmerId = req.user._id;

    // Latest reading per unique deviceId
    const latest = await SensorData.aggregate([
      { $match: { farmerId } },
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$deviceId', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
    ]);

    // Averages over last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stats = await SensorData.aggregate([
      { $match: { farmerId, timestamp: { $gte: since } } },
      { $group: {
        _id: null,
        avgMoisture: { $avg: '$soilMoisture' },
        avgTemp:     { $avg: '$temperature' },
        avgHumidity: { $avg: '$humidity' },
        avgPH:       { $avg: '$soilPH' },
        totalReadings: { $sum: 1 },
      }},
    ]);

    // Recent alerts
    const recentAlerts = await SensorData.find({ farmerId, alertLevel: { $ne: 'ok' } })
      .sort({ timestamp: -1 }).limit(10).select('alerts alertLevel zone timestamp');

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

// ─── GET HISTORICAL DATA (7-day chart) ────────
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

module.exports = { receiveSensorData, getLatestReading, getDashboard, getHistory };
