const express = require('express');
const router = express.Router();
const { receiveSensorData, getLatestReading, getDashboard, getHistory } = require('../controllers/sensorController');
const { protect } = require('../middleware/auth');

// ESP32 posts here — no auth (uses deviceId instead)
router.post('/data',              receiveSensorData);

// Protected — farmer/dashboard
router.get('/dashboard',          protect, getDashboard);
router.get('/latest/:deviceId',   getLatestReading);
router.get('/history/:deviceId',  getHistory);

module.exports = router;
