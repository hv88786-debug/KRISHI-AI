require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const connectDB    = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// ─── Routes ───────────────────────────────────
const authRoutes    = require('./routes/auth');
const sensorRoutes  = require('./routes/sensor');
const diseaseRoutes = require('./routes/disease');
const marketRoutes  = require('./routes/market');
const schemesRoutes = require('./routes/schemes');
const voiceRoutes   = require('./routes/voice');

const app = express();

// ─── Database ─────────────────────────────────
connectDB();

// ─── Rate Limiting ────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  message: { success: false, message: 'Too many requests — please try again later' }
});

// ─── Middleware ───────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/api/', limiter);

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── API Routes ───────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/sensor',  sensorRoutes);
app.use('/api/disease', diseaseRoutes);
app.use('/api/market',  marketRoutes);
app.use('/api/schemes', schemesRoutes);
app.use('/api/voice',   voiceRoutes);

// ─── Health Check ─────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'AgroGuardian API is running 🌱',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth:    '/api/auth    — register, login, profile',
      sensor:  '/api/sensor  — IoT data, dashboard, history',
      disease: '/api/disease — AI image scan, history',
      market:  '/api/market  — prices, forecast, best mandi',
      schemes: '/api/schemes — eligibility check, apply',
      voice:   '/api/voice   — IVR webhook, text query',
    }
  });
});

// ─── 404 Handler ──────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Error Handler ────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 AgroGuardian API running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌱 Alpha Coders — GEC Ajmer\n`);
});
