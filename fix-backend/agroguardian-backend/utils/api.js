/**
 * AgroGuardian Frontend API Helper
 * Include this in your HTML pages to call the backend
 * Usage: <script src="path/to/api.js"></script>
 */

const API_BASE = 'http://localhost:5000/api';

const AgroAPI = {
  // ── Token helpers ──────────────────────────
  getToken: () => localStorage.getItem('agro_token'),
  setToken: (t) => localStorage.setItem('agro_token', t),
  clearToken: () => localStorage.removeItem('agro_token'),

  headers: (isForm = false) => ({
    ...(!isForm && { 'Content-Type': 'application/json' }),
    ...(AgroAPI.getToken() && { Authorization: `Bearer ${AgroAPI.getToken()}` }),
  }),

  // ── Core fetch ─────────────────────────────
  async request(method, path, body = null, isForm = false) {
    try {
      const opts = { method, headers: AgroAPI.headers(isForm) };
      if (body) opts.body = isForm ? body : JSON.stringify(body);
      const res = await fetch(`${API_BASE}${path}`, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');
      return data;
    } catch (err) {
      console.error('AgroAPI Error:', err.message);
      throw err;
    }
  },

  // ── Auth ───────────────────────────────────
  auth: {
    async register(payload) {
      const data = await AgroAPI.request('POST', '/auth/register', payload);
      if (data.token) AgroAPI.setToken(data.token);
      return data;
    },
    async login(phone, password) {
      const data = await AgroAPI.request('POST', '/auth/login', { phone, password });
      if (data.token) AgroAPI.setToken(data.token);
      return data;
    },
    logout() { AgroAPI.clearToken(); window.location.href = 'index.html'; },
    getProfile:    () => AgroAPI.request('GET',  '/auth/profile'),
    updateProfile: (p) => AgroAPI.request('PUT',  '/auth/profile', p),
  },

  // ── Sensor / Dashboard ─────────────────────
  sensor: {
    getDashboard:     () => AgroAPI.request('GET', '/sensor/dashboard'),
    getLatest:     (id) => AgroAPI.request('GET', `/sensor/latest/${id}`),
    getHistory: (id, days=7) => AgroAPI.request('GET', `/sensor/history/${id}?days=${days}`),
    postData:      (d) => AgroAPI.request('POST', '/sensor/data', d),
  },

  // ── Disease Detection ──────────────────────
  disease: {
    async analyze(file, cropType) {
      const form = new FormData();
      form.append('image', file);
      if (cropType) form.append('cropType', cropType);
      return AgroAPI.request('POST', '/disease/analyze', form, true);
    },
    getHistory: () => AgroAPI.request('GET', '/disease/history'),
    getScan: (id) => AgroAPI.request('GET', `/disease/${id}`),
  },

  // ── Market Prices ──────────────────────────
  market: {
    getAll:      (params='') => AgroAPI.request('GET', `/market?${params}`),
    getBestMandi:(crop)      => AgroAPI.request('GET', `/market/best/${encodeURIComponent(crop)}`),
    getForecast: (crop)      => AgroAPI.request('GET', `/market/forecast/${encodeURIComponent(crop)}`),
    getSummary:  ()          => AgroAPI.request('GET', '/market/summary'),
    filter: (category, crop='') =>
      AgroAPI.market.getAll(`category=${category}&crop=${crop}`),
  },

  // ── Schemes ────────────────────────────────
  schemes: {
    getAll:     (cat='')  => AgroAPI.request('GET', `/schemes?category=${cat}`),
    check:      (data)    => AgroAPI.request('POST', '/schemes/check', data),
    apply:      (data)    => AgroAPI.request('POST', '/schemes/apply', data),
    myApps:     ()        => AgroAPI.request('GET',  '/schemes/my'),
  },

  // ── Voice ──────────────────────────────────
  voice: {
    query:      (q, lang='hi') => AgroAPI.request('POST', '/voice/query', { query: q, language: lang }),
    getLanguages: ()           => AgroAPI.request('GET',  '/voice/languages'),
  },
};

// Auto-check login status
window.addEventListener('DOMContentLoaded', () => {
  const token = AgroAPI.getToken();
  const protectedPages = ['dashboard.html'];
  const page = window.location.pathname.split('/').pop();
  if (protectedPages.includes(page) && !token) {
    // Uncomment to enforce auth:
    // window.location.href = 'login.html';
  }
});
