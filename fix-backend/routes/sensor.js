const express = require('express');
const router  = express.Router();
const {
  receiveSensorData,
  getLatestReading,
  getDashboard,
  getHistory,
  controlPump
} = require('../controllers/sensorController');
const { protect } = require('../middleware/auth');

// ESP32 → POST sensor data (no auth — uses deviceId)
router.post('/data',              receiveSensorData);

// Dashboard → GET data (protected)
router.get('/dashboard',          protect, getDashboard);
router.get('/latest/:deviceId',   getLatestReading);
router.get('/history/:deviceId',  getHistory);

// Website pump toggle → POST pump command
// Body: { zone: "Zone-1", action: "on" | "off" | "auto" }
router.post('/pump/:deviceId', controlPump);

module.exports = router;
