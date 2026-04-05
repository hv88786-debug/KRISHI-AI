# 🌱 AgroGuardian AI — Backend API

**Node.js + Express + MongoDB**  
Built by Alpha Coders — GEC Ajmer 🔥

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env file
cp .env.example .env
# Edit .env → add your MONGO_URI

# 3. Start dev server
npm run dev

# 4. API running at:
# http://localhost:5000/api/health
```

---

## 📁 Folder Structure

```
agroguardian-backend/
├── server.js              ← Entry point
├── .env.example           ← Environment variables template
├── config/
│   └── db.js              ← MongoDB connection
├── models/
│   ├── User.js            ← Farmer accounts
│   ├── SensorData.js      ← ESP32 IoT readings
│   ├── DiseaseDetection.js← AI scan records
│   ├── MarketPrice.js     ← Mandi price data
│   └── SchemeApplication.js← Govt scheme applications
├── controllers/
│   ├── authController.js  ← Register, Login, Profile
│   ├── sensorController.js← IoT data + Dashboard
│   ├── diseaseController.js← Image AI analysis
│   ├── marketController.js← Prices + Forecast
│   ├── schemesController.js← Eligibility + Apply
│   └── voiceController.js ← IVR + Voice queries
├── routes/
│   ├── auth.js
│   ├── sensor.js
│   ├── disease.js
│   ├── market.js
│   ├── schemes.js
│   └── voice.js
├── middleware/
│   ├── auth.js            ← JWT protect middleware
│   └── errorHandler.js    ← Global error handler
├── utils/
│   └── api.js             ← Frontend JS helper (copy to frontend)
└── uploads/               ← Uploaded crop images stored here
```

---

## 🔌 API Endpoints

### 🔐 Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new farmer |
| POST | `/api/auth/login` | Login → get JWT token |
| GET  | `/api/auth/profile` | Get my profile (🔒) |
| PUT  | `/api/auth/profile` | Update profile (🔒) |

### 📡 IoT Sensor
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sensor/data` | ESP32 posts sensor reading |
| GET  | `/api/sensor/dashboard` | Full dashboard (🔒) |
| GET  | `/api/sensor/latest/:deviceId` | Latest reading |
| GET  | `/api/sensor/history/:deviceId` | 7-day history chart |

### 🔬 Disease Detection
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/disease/analyze` | Upload leaf image → AI result (🔒) |
| GET  | `/api/disease/history` | My scan history (🔒) |
| GET  | `/api/disease/:id` | Single scan result (🔒) |

### 📈 Market Prices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/market` | All prices (filter: ?category=veg&crop=onion) |
| GET  | `/api/market/best/:crop` | Best mandi for a crop |
| GET  | `/api/market/forecast/:crop` | AI 7-day price forecast |
| GET  | `/api/market/summary` | Category-wise summary |

### 🏛️ Govt Schemes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/schemes` | All schemes (filter: ?category=central) |
| POST | `/api/schemes/check` | Check eligibility (no auth needed) |
| POST | `/api/schemes/apply` | Submit application (🔒) |
| GET  | `/api/schemes/my` | My applications (🔒) |

### ☎️ Voice AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/voice/webhook` | IVR provider webhook |
| POST | `/api/voice/query` | Text/voice query |
| GET  | `/api/voice/languages` | Supported languages |

---

## 🧪 Sample API Calls (cURL)

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ramesh Kumar","phone":"9876543210","password":"farm1234","state":"Rajasthan","landHolding":3.5,"farmerCategory":"small"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","password":"farm1234"}'

# Market prices (vegetable filter)
curl http://localhost:5000/api/market?category=veg

# Best mandi for wheat
curl http://localhost:5000/api/market/best/Wheat

# Price forecast
curl http://localhost:5000/api/market/forecast/Wheat

# Eligibility check
curl -X POST http://localhost:5000/api/schemes/check \
  -H "Content-Type: application/json" \
  -d '{"landHolding":2,"farmerCategory":"small","state":"Rajasthan"}'

# Post sensor data from ESP32
curl -X POST http://localhost:5000/api/sensor/data \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"ESP32-001","zone":"Zone-1","soilMoisture":28,"soilPH":6.5,"temperature":34,"humidity":60}'

# Voice text query
curl -X POST http://localhost:5000/api/voice/query \
  -H "Content-Type: application/json" \
  -d '{"query":"gehun ka bhav kya hai","language":"hi"}'
```

---

## 🔗 Connect Frontend to Backend

1. Copy `utils/api.js` to your frontend folder
2. Add to each HTML page:
```html
<script src="api.js"></script>
```
3. Use anywhere:
```javascript
// Login
const res = await AgroAPI.auth.login('9876543210', 'farm1234');

// Get market prices (vegetables)
const data = await AgroAPI.market.filter('veg');

// Disease scan
const result = await AgroAPI.disease.analyze(imageFile, 'wheat');

// Check scheme eligibility
const schemes = await AgroAPI.schemes.check({ landHolding: 3, farmerCategory: 'small', state: 'Rajasthan' });
```

---

## 🚀 Production Deployment

```bash
# Deploy on Railway / Render / Heroku:
# Set env vars:
MONGO_URI=mongodb+srv://...  (MongoDB Atlas)
JWT_SECRET=your_secret
NODE_ENV=production
CLIENT_URL=https://your-frontend.com
```

---

*Alpha Coders — GEC Ajmer 🌱 | Built for Hackathon 2026*
