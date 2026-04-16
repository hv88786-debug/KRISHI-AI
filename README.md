# 🌾 KRISHI-AI
### Smart IoT Farming System — Code War 2.0

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![ESP32](https://img.shields.io/badge/ESP32-IoT-blue?style=for-the-badge&logo=espressif&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)

> **KRISHI-AI** is a full-stack IoT-based smart farming system that monitors real-time soil and environmental conditions, predicts irrigation needs using AI, and automates water pump control — all accessible from a modern web dashboard.

---

## 🚀 Features

- 🌡️ **Real-time Monitoring** — Temperature, Soil Moisture, and Environmental data via ESP32
- 🤖 **AI Crop Recommendations** — Smart suggestions based on sensor data & weather
- 🌦️ **Live Weather Integration** — Open-Meteo API for hyperlocal weather forecasts
- 💧 **Automated Pump Control** — Remote & auto pump toggle based on soil moisture
- 🌱 **4 Crop Profiles** — Wheat, Rice, Cotton, Vegetables with custom thresholds
- 📊 **Live Dashboard** — Real-time charts, alerts, and sensor history
- 📱 **Multi-Page Frontend** — 6 pages: Dashboard, Crops, Weather, History, Alerts, Settings

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Hardware** | ESP32, DHT11, Soil Moisture Sensor, NTC Thermistor |
| **Firmware** | Arduino C++ (ESP32 Arduino Core) |
| **Backend** | Node.js, Express.js, MongoDB |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **APIs** | Open-Meteo Weather API |
| **Communication** | HTTP REST API (ESP32 → Backend) |

---

## 📡 Hardware Setup

| Sensor | ESP32 Pin |
|--------|-----------|
| DHT11 (Temp & Humidity) | GPIO 4 |
| Soil Moisture Sensor | GPIO 34 |
| NTC Thermistor | GPIO 35 |
| Relay (Water Pump) | GPIO 23 |

**Device ID:** `ESP32_FARM_001`

---

## ⚙️ How to Run

### 1. Clone the Repository
```bash
git clone https://github.com/hv88786-debug/KRISHI-AI.git
cd KRISHI-AI
```

### 2. Backend Setup
```bash
cd backend
npm install
npm start
```
> Backend runs on `http://localhost:5000`

### 3. Frontend Setup
- Open `frontend/index.html` with **VS Code Live Server**
- Runs on `http://localhost:5500`

### 4. ESP32 Firmware
- Open `firmware/KRISHI.ino` in Arduino IDE
- Set your **WiFi SSID, Password & Backend IP** in the config section
- Flash to ESP32

---

## 📁 Project Structure

```
KRISHI-AI/
├── backend/
│   ├── server.js          # Express server + MongoDB
│   ├── package.json
│   └── routes/
├── frontend/
│   ├── index.html         # Dashboard
│   ├── crops.html         # Crop Profiles
│   ├── weather.html       # Weather Forecast
│   ├── history.html       # Sensor History
│   ├── alerts.html        # Smart Alerts
│   └── settings.html      # Configuration
└── firmware/
    └── KRISHI.ino   # ESP32 Firmware
```

---

## 👨‍💻 Team Alpha Coders

| Name | Role |
|------|------|
| **Harish Kumar** | Team Lead, Backend & IoT |
| **Lucky Gupta** | Frontend Development |
| **Jiya Sapnani** | UI/UX & Research |
| **Meenakshi** | Data & Presentation |

> 🏆 Built for **PUNE AGRI HACKTHON** | Government Engineering College, Ajmer

---

## 📜 License

This project is built for educational and hackathon purposes.  
© 2026 Team Alpha Coders — GEC Ajmer
