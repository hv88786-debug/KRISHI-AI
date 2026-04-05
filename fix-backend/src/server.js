const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const logger = require('./utils/logger');
const { startIoTSimulator } = require('./utils/iotSimulator');

// ── ROUTES ──
const authRoutes = require('./routes/auth.routes');
const diseaseRoutes = require('./routes/disease.routes');
const marketRoutes = require('./routes/market.routes');
const schemesRoutes = require('./routes/schemes.routes');
const sensorRoutes = require('./routes/sensor.routes');
const voiceRoutes = require('./routes/voice.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();
const httpServer = createServer(app);

// ── SOCKET.IO (for live sensor data) ──
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Make io accessible in routes
app.set('io', io);

// ── MIDDLEWARE ──
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── RATE LIMITING ──
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, error: 'Too many requests. Please try again later.' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many login attempts. Please try again later.' }
});

// ── API ROUTES ──
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/disease', apiLimiter, diseaseRoutes);
app.use('/api/market', apiLimiter, marketRoutes);
app.use('/api/schemes', apiLimiter, schemesRoutes);
app.use('/api/sensors', apiLimiter, sensorRoutes);
app.use('/api/voice', apiLimiter, voiceRoutes);
app.use('/api/dashboard', apiLimiter, dashboardRoutes);

// ── HEALTH CHECK ──
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '🌱 AgroGuardian API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()) + 's',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ── 404 HANDLER ──
app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.originalUrl} not found` });
});

// ── GLOBAL ERROR HANDLER ──
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl}`);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Server error' : err.message
  });
});

// ── SOCKET.IO EVENTS ──
io.on('connection', (socket) => {
  logger.info(`📡 Client connected: ${socket.id}`);

  socket.on('subscribe_farm', (farmId) => {
    socket.join(`farm_${farmId}`);
    logger.info(`Client ${socket.id} subscribed to farm ${farmId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// ── MONGODB + START SERVER ──
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/agroguardian')
  .then(() => {
    logger.info('✅ MongoDB connected successfully');

    httpServer.listen(PORT, () => {
      logger.info(`🚀 AgroGuardian Server running on port ${PORT}`);
      logger.info(`📊 API Docs: http://localhost:${PORT}/api/health`);

      // Start IoT Simulator (sends live sensor data via WebSocket)
      if (process.env.IOT_SIMULATION === 'true') {
        startIoTSimulator(io);
        logger.info('🌡️  IoT Simulator started');
      }
    });
  })
  .catch(err => {
    logger.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = { app, io };
