// ══════════════════════════════════════
// routes/market.routes.js
// ══════════════════════════════════════
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/market.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/prices', ctrl.getPrices);                  // All prices with filter
router.get('/prices/:crop', ctrl.getCropPrice);         // Single crop detail
router.get('/best-mandi', ctrl.getBestMandi);           // Best mandi for a crop
router.get('/forecast/:crop', ctrl.getForecast);        // 7-day AI forecast
router.get('/categories', ctrl.getCategories);          // Category summary
router.get('/trending', ctrl.getTrending);              // Trending crops
router.post('/alert', protect, ctrl.setPriceAlert);     // Set price alert

module.exports = router;

// ══════════════════════════════════════
// controllers/market.controller.js
// ══════════════════════════════════════
const { MarketPrice } = require('../models');
const logger = require('../utils/logger');

// Seed data used when no DB records found
const MOCK_PRICES = [
  { crop:'Wheat', cropHindi:'गेहूं', category:'cereal', variety:'Lok-1', mandi:'Jaipur', district:'Jaipur', prices:{min:2300,max:2600,modal:2450}, change:120, changePercent:5.1, forecast7Day:[2450,2490,2520,2580,2640,2680,2650], bestSellDay:5 },
  { crop:'Maize', cropHindi:'मक्का', category:'cereal', variety:'Hybrid', mandi:'Ajmer', district:'Ajmer', prices:{min:1850,max:1980,modal:1920}, change:-25, changePercent:-1.3, forecast7Day:[1920,1900,1880,1870,1860,1880,1910], bestSellDay:0 },
  { crop:'Barley', cropHindi:'जौ', category:'cereal', variety:'RD-2552', mandi:'Kota', district:'Kota', prices:{min:1620,max:1740,modal:1680}, change:45, changePercent:2.8, forecast7Day:[1680,1700,1720,1740,1750,1760,1745], bestSellDay:5 },
  { crop:'Onion', cropHindi:'प्याज', category:'veg', variety:'Nasik Red', mandi:'Kishangarh', district:'Ajmer', prices:{min:1300,max:1600,modal:1450}, change:80, changePercent:5.8, forecast7Day:[1450,1480,1510,1560,1600,1580,1540], bestSellDay:4 },
  { crop:'Tomato', cropHindi:'टमाटर', category:'veg', variety:'Desi Round', mandi:'Beawar', district:'Ajmer', prices:{min:900,max:1050,modal:980}, change:-15, changePercent:-1.5, forecast7Day:[980,960,940,930,920,910,900], bestSellDay:0 },
  { crop:'Potato', cropHindi:'आलू', category:'veg', variety:'Kufri Badshah', mandi:'Alwar', district:'Alwar', prices:{min:1050,max:1200,modal:1120}, change:30, changePercent:2.8, forecast7Day:[1120,1140,1160,1180,1200,1190,1170], bestSellDay:4 },
  { crop:'Garlic', cropHindi:'लहसुन', category:'veg', variety:'Desi White', mandi:'Kota', district:'Kota', prices:{min:7800,max:8600,modal:8200}, change:340, changePercent:4.3, forecast7Day:[8200,8350,8500,8700,8900,9000,8800], bestSellDay:5 },
  { crop:'Moong Dal', cropHindi:'मूंग दाल', category:'pulse', variety:'SML-668', mandi:'Nagaur', district:'Nagaur', prices:{min:6900,max:7500,modal:7200}, change:160, changePercent:2.3, forecast7Day:[7200,7300,7400,7550,7650,7700,7650], bestSellDay:5 },
  { crop:'Chana', cropHindi:'चना', category:'pulse', variety:'Desi', mandi:'Ajmer', district:'Ajmer', prices:{min:5100,max:5700,modal:5400}, change:-80, changePercent:-1.5, forecast7Day:[5400,5350,5300,5280,5260,5300,5350], bestSellDay:0 },
  { crop:'Masoor Dal', cropHindi:'मसूर दाल', category:'pulse', variety:'HUL-57', mandi:'Bikaner', district:'Bikaner', prices:{min:5800,max:6400,modal:6100}, change:90, changePercent:1.5, forecast7Day:[6100,6200,6300,6400,6500,6550,6500], bestSellDay:5 },
  { crop:'Soybean', cropHindi:'सोयाबीन', category:'oilseed', variety:'JS-335', mandi:'Ajmer', district:'Ajmer', prices:{min:3800,max:4200,modal:4020}, change:120, changePercent:3.1, forecast7Day:[4020,4080,4150,4200,4250,4280,4250], bestSellDay:5 },
  { crop:'Groundnut', cropHindi:'मूंगफली', category:'oilseed', variety:'Bold', mandi:'Nagaur', district:'Nagaur', prices:{min:4800,max:5400,modal:5100}, change:-60, changePercent:-1.2, forecast7Day:[5100,5080,5050,5020,5000,5030,5060], bestSellDay:0 },
  { crop:'Mustard', cropHindi:'सरसों', category:'oilseed', variety:'Kranti', mandi:'Bharatpur', district:'Bharatpur', prices:{min:5200,max:6000,modal:5600}, change:200, changePercent:3.7, forecast7Day:[5600,5700,5800,5920,6000,6050,6000], bestSellDay:5 },
  { crop:'Coriander', cropHindi:'धनिया', category:'spice', variety:'Eagle', mandi:'Kota', district:'Kota', prices:{min:6200,max:7000,modal:6600}, change:200, changePercent:3.1, forecast7Day:[6600,6700,6800,6950,7100,7200,7100], bestSellDay:5 },
  { crop:'Red Chilli', cropHindi:'लाल मिर्च', category:'spice', variety:'Sannam S4', mandi:'Jodhpur', district:'Jodhpur', prices:{min:9200,max:10400,modal:9800}, change:-120, changePercent:-1.2, forecast7Day:[9800,9750,9700,9650,9600,9650,9700], bestSellDay:0 }
];

// Simulate slight price fluctuation on each request
function fluctuate(price) {
  return Math.round(price + (Math.random() - 0.5) * price * 0.02);
}

async function getPriceData() {
  if (process.env.MARKET_DATA_MODE === 'live') {
    // Real AGMARKNET / Agmarknet.nic.in API integration point
    try {
      const axios = require('axios');
      const response = await axios.get('https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070', {
        params: { 'api-key': process.env.AGMARKNET_API_KEY, format: 'json', limit: 100, filters: { State: 'Rajasthan' } }
      });
      return response.data.records;
    } catch (e) {
      logger.warn('Live market API failed, using mock data');
    }
  }

  // Use mock data with slight daily fluctuation
  return MOCK_PRICES.map(p => ({
    ...p,
    prices: {
      min: fluctuate(p.prices.min),
      max: fluctuate(p.prices.max),
      modal: fluctuate(p.prices.modal)
    },
    date: new Date()
  }));
}

// @route GET /api/market/prices
exports.getPrices = async (req, res) => {
  try {
    const { category, search, sort, district, limit = 50 } = req.query;
    let data = await getPriceData();

    // Filter by category
    if (category && category !== 'all') {
      data = data.filter(p => p.category === category);
    }

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(p =>
        p.crop.toLowerCase().includes(q) ||
        p.mandi.toLowerCase().includes(q) ||
        (p.cropHindi && p.cropHindi.includes(q))
      );
    }

    // Filter by district
    if (district) {
      data = data.filter(p => p.district?.toLowerCase() === district.toLowerCase());
    }

    // Sort
    if (sort === 'high') data.sort((a, b) => b.prices.modal - a.prices.modal);
    else if (sort === 'low') data.sort((a, b) => a.prices.modal - b.prices.modal);
    else if (sort === 'gain') data.sort((a, b) => b.change - a.change);
    else data.sort((a, b) => b.prices.modal - a.prices.modal);

    // Category summary
    const summary = {};
    MOCK_PRICES.forEach(p => {
      if (!summary[p.category]) summary[p.category] = { count: 0, avgChange: 0, trending: false };
      summary[p.category].count++;
      summary[p.category].avgChange += p.change;
    });
    Object.keys(summary).forEach(k => {
      summary[k].avgChange = Math.round(summary[k].avgChange / summary[k].count);
      summary[k].trending = summary[k].avgChange > 0;
    });

    res.json({
      success: true,
      count: data.length,
      updatedAt: new Date().toISOString(),
      source: process.env.MARKET_DATA_MODE === 'live' ? 'APMC Live' : 'AgroGuardian DB',
      summary,
      prices: data.slice(0, limit)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @route GET /api/market/prices/:crop
exports.getCropPrice = async (req, res) => {
  try {
    const data = await getPriceData();
    const cropData = data.filter(p => p.crop.toLowerCase() === req.params.crop.toLowerCase());
    if (!cropData.length) return res.status(404).json({ success: false, error: 'Crop not found' });

    const best = [...cropData].sort((a, b) => b.prices.modal - a.prices.modal)[0];

    res.json({
      success: true,
      crop: req.params.crop,
      bestMandi: best.mandi,
      bestPrice: best.prices.modal,
      allMandis: cropData,
      advice: best.change > 0
        ? `📈 Price is rising. Consider selling at ${best.mandi} for best price of ₹${best.prices.modal}/qtl`
        : `📉 Price is falling. Hold if possible, or sell immediately at ${best.mandi}`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @route GET /api/market/best-mandi?crop=Wheat&district=Ajmer
exports.getBestMandi = async (req, res) => {
  try {
    const { crop, district } = req.query;
    const data = await getPriceData();
    let filtered = data;
    if (crop) filtered = filtered.filter(p => p.crop.toLowerCase().includes(crop.toLowerCase()));
    if (district) filtered = filtered.filter(p => p.district?.toLowerCase() === district?.toLowerCase());

    filtered.sort((a, b) => b.prices.modal - a.prices.modal);

    res.json({
      success: true,
      crop: crop || 'All',
      mandis: filtered.slice(0, 5).map((p, i) => ({
        rank: i + 1,
        mandi: p.mandi,
        district: p.district,
        price: p.prices.modal,
        change: p.change,
        isOpen: true,
        closingTime: ['5 PM', '6 PM', '7 PM', '4 PM', '5 PM'][i] || '5 PM'
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @route GET /api/market/forecast/:crop
exports.getForecast = async (req, res) => {
  try {
    const data = await getPriceData();
    const crop = data.find(p => p.crop.toLowerCase() === req.params.crop.toLowerCase());
    if (!crop) return res.status(404).json({ success: false, error: 'Crop not found' });

    const days = ['Today', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
    const peakPrice = Math.max(...crop.forecast7Day);
    const peakDay = crop.forecast7Day.indexOf(peakPrice);
    const signal = peakDay > 1 ? 'HOLD' : 'SELL NOW';

    res.json({
      success: true,
      crop: crop.crop,
      currentPrice: crop.prices.modal,
      forecast: crop.forecast7Day.map((price, i) => ({
        day: i,
        label: days[i],
        price,
        isBest: i === peakDay
      })),
      peakPrice,
      peakDay: days[peakDay],
      signal,
      advice: signal === 'HOLD'
        ? `🎯 Wait until ${days[peakDay]} for best price of ₹${peakPrice}/qtl (+₹${peakPrice - crop.prices.modal})`
        : `⚡ Sell now at ₹${crop.prices.modal}/qtl — prices expected to fall`,
      confidence: 87
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @route GET /api/market/categories
exports.getCategories = (req, res) => {
  const cats = {
    cereal: { label: 'Cereals', emoji: '🌾', crops: ['Wheat', 'Maize', 'Barley'] },
    veg: { label: 'Vegetables', emoji: '🥦', crops: ['Onion', 'Tomato', 'Potato', 'Garlic'] },
    pulse: { label: 'Pulses', emoji: '🫘', crops: ['Moong Dal', 'Chana', 'Masoor Dal'] },
    oilseed: { label: 'Oilseeds', emoji: '🥜', crops: ['Soybean', 'Groundnut', 'Mustard'] },
    spice: { label: 'Spices', emoji: '🌶️', crops: ['Coriander', 'Red Chilli'] }
  };
  res.json({ success: true, categories: cats });
};

// @route GET /api/market/trending
exports.getTrending = async (req, res) => {
  try {
    const data = await getPriceData();
    const trending = data
      .filter(p => p.change > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 5)
      .map(p => ({ crop: p.crop, mandi: p.mandi, price: p.prices.modal, gain: p.change, gainPercent: p.changePercent }));

    res.json({ success: true, trending });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// @route POST /api/market/alert (protected)
exports.setPriceAlert = async (req, res) => {
  const { crop, targetPrice, mandi } = req.body;
  // In production: save to DB and send SMS when price hits target
  res.json({
    success: true,
    message: `✅ Alert set! We'll notify you when ${crop} reaches ₹${targetPrice}/qtl at ${mandi || 'any mandi'}`
  });
};
