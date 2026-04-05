// ════════════════════════════════════════════════════════
// frontend-integration/api.js
// Drop this file in your agroguardian website folder
// Include in HTML: <script src="api.js"></script>
// ════════════════════════════════════════════════════════

const API_BASE = 'http://localhost:5000/api';  // Change to production URL

// ── Auth Helper ──
const Auth = {
  getToken: () => localStorage.getItem('ag_token'),
  getUser: () => JSON.parse(localStorage.getItem('ag_user') || 'null'),
  isLoggedIn: () => !!localStorage.getItem('ag_token'),
  logout: () => { localStorage.removeItem('ag_token'); localStorage.removeItem('ag_user'); window.location.href = 'index.html'; }
};

// ── API Request Helper ──
async function apiRequest(endpoint, method = 'GET', body = null, isFormData = false) {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (Auth.getToken()) headers['Authorization'] = `Bearer ${Auth.getToken()}`;

  const opts = { method, headers };
  if (body) opts.body = isFormData ? body : JSON.stringify(body);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API error');
    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err.message);
    throw err;
  }
}

// ════════════════════════════════════════════════════════
// AUTH API
// ════════════════════════════════════════════════════════
const AuthAPI = {
  // Register new farmer
  register: async (formData) => {
    const data = await apiRequest('/auth/register', 'POST', formData);
    if (data.token) {
      localStorage.setItem('ag_token', data.token);
      localStorage.setItem('ag_user', JSON.stringify(data.user));
    }
    return data;
  },

  // Login farmer
  login: async (phone, password) => {
    const data = await apiRequest('/auth/login', 'POST', { phone, password });
    if (data.token) {
      localStorage.setItem('ag_token', data.token);
      localStorage.setItem('ag_user', JSON.stringify(data.user));
    }
    return data;
  },

  // Get current user profile
  getProfile: () => apiRequest('/auth/me')
};

// ════════════════════════════════════════════════════════
// DISEASE AI API
// ════════════════════════════════════════════════════════
const DiseaseAPI = {
  // Analyze leaf image for disease
  // Usage: DiseaseAPI.analyze(fileInput.files[0], 'Wheat')
  analyze: async (imageFile, cropType, farmId) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    if (cropType) formData.append('cropType', cropType);
    if (farmId) formData.append('farmId', farmId);
    return apiRequest('/disease/analyze', 'POST', formData, true);
  },

  // Get scan history
  getHistory: (page = 1) => apiRequest(`/disease/history?page=${page}`),

  // Get all diseases list
  getDiseases: () => apiRequest('/disease/diseases')
};

// ════════════════════════════════════════════════════════
// MARKET API
// ════════════════════════════════════════════════════════
const MarketAPI = {
  // Get prices with optional filters
  // Usage: MarketAPI.getPrices({ category: 'cereal', search: 'wheat', sort: 'high' })
  getPrices: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiRequest(`/market/prices?${params}`);
  },

  // Get 7-day forecast for a crop
  getForecast: (crop) => apiRequest(`/market/forecast/${crop}`),

  // Get best mandi for a crop
  getBestMandi: (crop, district) => apiRequest(`/market/best-mandi?crop=${crop}&district=${district || ''}`),

  // Get trending crops
  getTrending: () => apiRequest('/market/trending'),

  // Set price alert
  setAlert: (crop, targetPrice, mandi) => apiRequest('/market/alert', 'POST', { crop, targetPrice, mandi })
};

// ════════════════════════════════════════════════════════
// SENSOR / IOT API
// ════════════════════════════════════════════════════════
const SensorAPI = {
  // Get live sensor data for a farm
  getLive: (farmId) => apiRequest(`/sensors/live/${farmId}`),

  // Get historical readings
  getHistory: (farmId, hours = 24) => apiRequest(`/sensors/history/${farmId}?hours=${hours}`),

  // Control pump
  controlPump: (farmId, zone, action) => apiRequest(`/sensors/pump/${farmId}`, 'POST', { zone, action }),

  // Get active alerts
  getAlerts: (farmId) => apiRequest(`/sensors/alerts/${farmId}`)
};

// ════════════════════════════════════════════════════════
// SCHEMES API
// ════════════════════════════════════════════════════════
const SchemesAPI = {
  // Get all schemes
  getAll: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiRequest(`/schemes?${params}`);
  },

  // Check eligibility
  checkEligibility: (data) => apiRequest('/schemes/check-eligibility', 'POST', data)
};

// ════════════════════════════════════════════════════════
// DASHBOARD API
// ════════════════════════════════════════════════════════
const DashboardAPI = {
  getSummary: (farmId) => apiRequest(`/dashboard/summary?farmId=${farmId || ''}`)
};

// ════════════════════════════════════════════════════════
// WEBSOCKET - Live Sensor Updates
// ════════════════════════════════════════════════════════
class LiveSensorFeed {
  constructor(farmId, onUpdate, onAlert) {
    this.farmId = farmId;
    this.onUpdate = onUpdate;
    this.onAlert = onAlert;
    this.socket = null;
  }

  connect() {
    // Load Socket.IO client
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.6.0/socket.io.min.js';
    script.onload = () => this._init();
    document.head.appendChild(script);
  }

  _init() {
    this.socket = io('http://localhost:5000');  // Change for production

    this.socket.on('connect', () => {
      console.log('📡 Connected to AgroGuardian live feed');
      this.socket.emit('subscribe_farm', this.farmId);
    });

    this.socket.on('sensor_update', (data) => {
      if (this.onUpdate) this.onUpdate(data);

      // Trigger alerts
      if (data.alerts?.length && this.onAlert) {
        data.alerts.forEach(alert => this.onAlert(alert));
      }
    });

    this.socket.on('pump_update', (data) => {
      console.log('💧 Pump update:', data);
    });

    this.socket.on('disconnect', () => {
      console.log('📡 Disconnected from live feed');
    });
  }

  disconnect() {
    if (this.socket) this.socket.disconnect();
  }
}

// ════════════════════════════════════════════════════════
// EXAMPLE USAGE (how to use in your HTML pages)
// ════════════════════════════════════════════════════════

/*
=== 1. DISEASE PAGE - Analyze leaf photo ===

const diseaseForm = document.getElementById('disease-form');
diseaseForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const imageFile = document.getElementById('leaf-image').files[0];
  const cropType = document.getElementById('crop-type').value;

  try {
    showLoader('Analyzing with AI...');
    const result = await DiseaseAPI.analyze(imageFile, cropType);
    displayDiseaseResult(result.analysis);
  } catch (err) {
    showError('Analysis failed. Please try again.');
  }
});

=== 2. MARKET PAGE - Filter by category ===

async function filterByCategory(category) {
  const result = await MarketAPI.getPrices({ category, sort: 'high' });
  renderPriceTable(result.prices);
  updateCount(result.count);
}

=== 3. DASHBOARD - Live IoT data ===

const feed = new LiveSensorFeed(
  'demo_farm_001',
  (data) => {
    // Update UI with new sensor readings
    document.getElementById('moisture').textContent = data.readings.soilMoisture + '%';
    document.getElementById('temp').textContent = data.readings.temperature + '°C';
    document.getElementById('pump-status').textContent = data.pumpStatus ? 'ON 💧' : 'OFF';
  },
  (alert) => {
    showNotification(alert.message, alert.severity);
  }
);
feed.connect();

=== 4. SCHEMES - Check eligibility ===

async function checkSchemes() {
  const result = await SchemesAPI.checkEligibility({
    landHolding: document.getElementById('land').value,
    farmerCategory: 'small',
    state: 'Rajasthan'
  });
  renderSchemes(result.schemes);
  showMessage(`${result.count} schemes found!`);
}

=== 5. AUTH - Login ===

async function login() {
  try {
    const data = await AuthAPI.login('9001234567', 'farmer123');
    showWelcome(data.user.name);
    redirectToDashboard();
  } catch (err) {
    showError('Login failed: ' + err.message);
  }
}
*/

// Export for use in modules (if using bundler)
if (typeof module !== 'undefined') {
  module.exports = { AuthAPI, DiseaseAPI, MarketAPI, SensorAPI, SchemesAPI, DashboardAPI, LiveSensorFeed, Auth };
}
