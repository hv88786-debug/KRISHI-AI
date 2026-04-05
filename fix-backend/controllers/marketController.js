const MarketPrice = require('../models/MarketPrice');

// ─── SEED DATA (run once if DB empty) ─────────
const SEED_PRICES = [
  { crop:'Wheat',     variety:'Lok-1',       category:'cereal',   mandi:'Jaipur',      district:'Jaipur',      modalPrice:2450, minPrice:2300, maxPrice:2600 },
  { crop:'Wheat',     variety:'Lok-1',       category:'cereal',   mandi:'Ajmer',       district:'Ajmer',       modalPrice:2280, minPrice:2150, maxPrice:2400 },
  { crop:'Wheat',     variety:'Lok-1',       category:'cereal',   mandi:'Kishangarh',  district:'Ajmer',       modalPrice:2310, minPrice:2180, maxPrice:2450 },
  { crop:'Maize',     variety:'Hybrid',      category:'cereal',   mandi:'Ajmer',       district:'Ajmer',       modalPrice:1920, minPrice:1850, maxPrice:1980 },
  { crop:'Barley',    variety:'RD-2552',     category:'cereal',   mandi:'Kota',        district:'Kota',        modalPrice:1680, minPrice:1620, maxPrice:1740 },
  { crop:'Onion',     variety:'Nasik Red',   category:'veg',      mandi:'Kishangarh',  district:'Ajmer',       modalPrice:1450, minPrice:1300, maxPrice:1600 },
  { crop:'Tomato',    variety:'Desi Round',  category:'veg',      mandi:'Beawar',      district:'Ajmer',       modalPrice:980,  minPrice:900,  maxPrice:1050 },
  { crop:'Potato',    variety:'Kufri Badshah',category:'veg',     mandi:'Alwar',       district:'Alwar',       modalPrice:1120, minPrice:1050, maxPrice:1200 },
  { crop:'Garlic',    variety:'Desi White',  category:'veg',      mandi:'Kota',        district:'Kota',        modalPrice:8200, minPrice:7800, maxPrice:8600 },
  { crop:'Moong',     variety:'SML-668',     category:'pulse',    mandi:'Nagaur',      district:'Nagaur',      modalPrice:7200, minPrice:6900, maxPrice:7500 },
  { crop:'Chana',     variety:'Desi',        category:'pulse',    mandi:'Ajmer',       district:'Ajmer',       modalPrice:5400, minPrice:5100, maxPrice:5700 },
  { crop:'Masoor',    variety:'HUL-57',      category:'pulse',    mandi:'Bikaner',     district:'Bikaner',     modalPrice:6100, minPrice:5800, maxPrice:6400 },
  { crop:'Soybean',   variety:'JS-335',      category:'oilseed',  mandi:'Ajmer',       district:'Ajmer',       modalPrice:4020, minPrice:3800, maxPrice:4200 },
  { crop:'Groundnut', variety:'Bold',        category:'oilseed',  mandi:'Nagaur',      district:'Nagaur',      modalPrice:5100, minPrice:4800, maxPrice:5400 },
  { crop:'Mustard',   variety:'Kranti',      category:'oilseed',  mandi:'Bharatpur',   district:'Bharatpur',   modalPrice:5600, minPrice:5200, maxPrice:6000 },
  { crop:'Coriander', variety:'Eagle',       category:'spice',    mandi:'Kota',        district:'Kota',        modalPrice:6600, minPrice:6200, maxPrice:7000 },
  { crop:'Red Chilli',variety:'Sannam S4',   category:'spice',    mandi:'Jodhpur',     district:'Jodhpur',     modalPrice:9800, minPrice:9200, maxPrice:10400 },
];

const seedIfEmpty = async () => {
  const count = await MarketPrice.countDocuments();
  if (count === 0) {
    await MarketPrice.insertMany(SEED_PRICES.map(p => ({ ...p, priceDate: new Date() })));
    console.log('🌱 Market prices seeded');
  }
};

// ─── GET ALL PRICES (with filter/sort) ────────
const getAllPrices = async (req, res, next) => {
  try {
    await seedIfEmpty();
    const { category, mandi, crop, sort = '-modalPrice' } = req.query;

    const filter = {};
    if (category && category !== 'all') filter.category = category;
    if (mandi)    filter.mandi = new RegExp(mandi, 'i');
    if (crop)     filter.crop  = new RegExp(crop, 'i');

    const prices = await MarketPrice.find(filter).sort(sort).limit(50);
    res.json({ success: true, count: prices.length, prices });
  } catch (err) { next(err); }
};

// ─── GET BEST MANDI FOR A CROP ────────────────
const getBestMandi = async (req, res, next) => {
  try {
    const { crop } = req.params;
    const mandis = await MarketPrice.find({ crop: new RegExp(crop, 'i') })
      .sort({ modalPrice: -1 }).limit(5);
    if (!mandis.length) return res.status(404).json({ success: false, message: 'No data for this crop' });
    res.json({ success: true, crop, bestMandi: mandis[0], allMandis: mandis });
  } catch (err) { next(err); }
};

// ─── AI PRICE FORECAST (mock 7-day) ───────────
const getPriceForecast = async (req, res, next) => {
  try {
    const { crop } = req.params;
    const latest = await MarketPrice.findOne({ crop: new RegExp(crop, 'i') }).sort({ priceDate: -1 });
    if (!latest) return res.status(404).json({ success: false, message: 'Crop not found' });

    const base = latest.modalPrice;
    // Simple trend simulation (replace with real ML forecast)
    const trend = [0, 0.9, 1.8, 3.2, 4.8, 6.1, 4.5];
    const forecast = trend.map((delta, i) => ({
      day: i === 0 ? 'Today' : `Day ${i + 1}`,
      price: Math.round(base + (base * delta / 100)),
      date: new Date(Date.now() + i * 86400000).toLocaleDateString('en-IN'),
    }));

    const peak = forecast.reduce((a, b) => (a.price > b.price ? a : b));
    const signal = peak.day !== 'Today' ? `Hold — sell on ${peak.day} for ₹${peak.price - base} more/qtl` : 'Sell today — price at peak';

    res.json({ success: true, crop, currentPrice: base, forecast, peak, signal });
  } catch (err) { next(err); }
};

// ─── ADD/UPDATE PRICE (admin) ─────────────────
const upsertPrice = async (req, res, next) => {
  try {
    const { crop, mandi, modalPrice, minPrice, maxPrice, variety, category, district } = req.body;
    const price = await MarketPrice.findOneAndUpdate(
      { crop, mandi, priceDate: { $gte: new Date().setHours(0,0,0,0) } },
      { modalPrice, minPrice, maxPrice, variety, category, district, priceDate: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: 'Price updated', price });
  } catch (err) { next(err); }
};

// ─── CATEGORY SUMMARY ─────────────────────────
const getCategorySummary = async (req, res, next) => {
  try {
    await seedIfEmpty();
    const summary = await MarketPrice.aggregate([
      { $group: {
        _id: '$category',
        avgPrice: { $avg: '$modalPrice' },
        cropCount: { $sum: 1 },
        maxPrice:  { $max: '$modalPrice' },
      }},
      { $sort: { avgPrice: -1 } },
    ]);
    res.json({ success: true, summary });
  } catch (err) { next(err); }
};

module.exports = { getAllPrices, getBestMandi, getPriceForecast, upsertPrice, getCategorySummary };
