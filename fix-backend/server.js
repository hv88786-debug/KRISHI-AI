require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const path      = require('path');
const http      = require('http');
const { Server } = require('socket.io');

const connectDB     = require('./config/db');
const errorHandler  = require('./middleware/errorHandler');

const authRoutes    = require('./routes/auth');
const sensorRoutes  = require('./routes/sensor');
const diseaseRoutes = require('./routes/disease');
const marketRoutes  = require('./routes/market');
const schemesRoutes = require('./routes/schemes');
const voiceRoutes       = require('./routes/voice');
const equipmentRoutes   = require('./routes/equipment');
const pesticideRoutes   = require('./routes/pesticide');

const app    = express();
const server = http.createServer(app);

// ─── Socket.io ────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] }
});

// Make io globally accessible in controllers
global.io = io;
global.connectedDevices = {}; // { deviceId: socketId }

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  // ESP32 registers itself after wifi connect
  socket.on('register_device', ({ deviceId }) => {
    global.connectedDevices[deviceId] = socket.id;
    socket.deviceId = deviceId;
    socket.join('device_' + deviceId);
    console.log('📡 ESP32 registered:', deviceId);
    io.emit('device_status', { deviceId, online: true, ts: Date.now() });
  });

  // Dashboard subscribes to updates
  socket.on('subscribe_farm', (farmId) => {
    socket.join('farm_' + farmId);
    console.log('👨‍🌾 Dashboard subscribed to farm:', farmId);
  });

  // ESP32 sends live sensor data via socket
  socket.on('sensor_data', (data) => {
    io.emit('sensor_update', { ...data, ts: Date.now() });
  });

  // ESP32 confirms pump action
  socket.on('pump_ack', ({ deviceId, zone, action, success }) => {
    console.log('💧 Pump ACK:', deviceId, zone, action, success ? 'OK' : 'FAIL');
    io.emit('pump_update', { deviceId, zone, action, success, ts: Date.now() });
  });

  socket.on('disconnect', () => {
    if (socket.deviceId) {
      delete global.connectedDevices[socket.deviceId];
      io.emit('device_status', { deviceId: socket.deviceId, online: false, ts: Date.now() });
      console.log('📴 ESP32 offline:', socket.deviceId);
    }
  });
});

// ─── Database ─────────────────────────────────
connectDB();

// ─── Middleware ───────────────────────────────
// ─── CORS — allow Live Server, file://, and any local IP ─────
const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5501',
  'http://127.0.0.1:5501',
  'http://localhost:3000',
  'null',  // file:// protocol
];
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, ESP32)
    if (!origin) return callback(null, true);
    // Allow any local network IP (192.168.x.x, 10.x.x.x) — for hotspot
    if (/^http:\/\/(192\.168\.|10\.|172\.)/.test(origin)) return callback(null, true);
    // Allow localhost
    if (/^http:\/\/(localhost|127\.0\.0\.1)/.test(origin)) return callback(null, true);
    // Check allowed list
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Log blocked origin for debugging
    console.log('CORS blocked origin:', origin);
    callback(null, true); // allow all for development
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 500 }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Routes ───────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/sensor',  sensorRoutes);
app.use('/api/disease', diseaseRoutes);
app.use('/api/market',  marketRoutes);
app.use('/api/schemes', schemesRoutes);
app.use('/api/voice',     voiceRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/pesticide', pesticideRoutes);

// ─── Health ───────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'AgroGuardian API running 🌱',
    version: '2.0.0',
    socketio: 'enabled',
    connectedDevices: Object.keys(global.connectedDevices)
  });
});

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('\n🚀 AgroGuardian API  → http://localhost:' + PORT);
  console.log('⚡ Socket.io enabled → real-time sensor + pump control');
  console.log('🌱 Alpha Coders — GEC Ajmer\n');
});
