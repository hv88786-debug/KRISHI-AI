// utils/seeder.js
// Run: node src/utils/seeder.js
// Seeds demo farmer, market prices, and schemes into MongoDB

require('dotenv').config();
const mongoose = require('mongoose');
const { User, Farm, MarketPrice, Scheme } = require('../models');
const logger = require('./logger');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/agroguardian';

const DEMO_USER = {
  name: 'Ramesh Kumar',
  phone: '9001234567',
  password: 'farmer123',
  email: 'ramesh@example.com',
  profile: { village: 'Pisangan', district: 'Ajmer', state: 'Rajasthan', landHolding: 4.5, farmerCategory: 'medium', primaryCrop: 'Wheat' }
};

const DEMO_PRICES = [
  { crop:'Wheat', cropHindi:'गेहूं', category:'cereal', variety:'Lok-1', mandi:'Jaipur', district:'Jaipur', prices:{min:2300,max:2600,modal:2450}, change:120, changePercent:5.1, forecast7Day:[2450,2490,2520,2580,2640,2680,2650], bestSellDay:5 },
  { crop:'Onion', cropHindi:'प्याज', category:'veg', variety:'Nasik Red', mandi:'Kishangarh', district:'Ajmer', prices:{min:1300,max:1600,modal:1450}, change:80, changePercent:5.8, forecast7Day:[1450,1480,1510,1560,1600,1580,1540], bestSellDay:4 },
  { crop:'Moong Dal', cropHindi:'मूंग दाल', category:'pulse', variety:'SML-668', mandi:'Nagaur', district:'Nagaur', prices:{min:6900,max:7500,modal:7200}, change:160, changePercent:2.3, forecast7Day:[7200,7300,7400,7550,7650,7700,7650], bestSellDay:5 },
  { crop:'Mustard', cropHindi:'सरसों', category:'oilseed', variety:'Kranti', mandi:'Bharatpur', district:'Bharatpur', prices:{min:5200,max:6000,modal:5600}, change:200, changePercent:3.7, forecast7Day:[5600,5700,5800,5920,6000,6050,6000], bestSellDay:5 },
  { crop:'Coriander', cropHindi:'धनिया', category:'spice', variety:'Eagle', mandi:'Kota', district:'Kota', prices:{min:6200,max:7000,modal:6600}, change:200, changePercent:3.1, forecast7Day:[6600,6700,6800,6950,7100,7200,7100], bestSellDay:5 }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Farm.deleteMany({});
    await MarketPrice.deleteMany({});
    logger.info('🗑️  Cleared existing data');

    // Create demo farmer
    const user = await User.create(DEMO_USER);
    logger.info(`👨‍🌾 Demo farmer created: ${user.phone} / password: farmer123`);

    // Create demo farm
    const farm = await Farm.create({
      owner: user._id,
      name: "Ramesh's Farm",
      location: { village: 'Pisangan', district: 'Ajmer', state: 'Rajasthan', coordinates: { lat: 26.4499, lng: 74.6399 } },
      area: 4.5,
      currentCrop: 'Wheat',
      soilType: 'loamy',
      zones: [
        { zoneId: 'Z1', name: 'Zone 1', area: 2.5, crop: 'Wheat', pumpStatus: false },
        { zoneId: 'Z2', name: 'Zone 2', area: 2.0, crop: 'Onion', pumpStatus: false }
      ],
      devices: [{ deviceId: 'ESP32_DEMO_01', type: 'esp32', zone: 'Zone 1', isActive: true }]
    });
    user.farms.push(farm._id);
    await user.save({ validateBeforeSave: false });
    logger.info(`🌾 Demo farm created: ${farm.name}`);

    // Seed market prices
    await MarketPrice.insertMany(DEMO_PRICES.map(p => ({ ...p, date: new Date() })));
    logger.info(`💰 Seeded ${DEMO_PRICES.length} market prices`);

    logger.info('\n✅ ══════════════════════════════════════════');
    logger.info('   SEEDING COMPLETE! AgroGuardian DB Ready');
    logger.info('   Demo Login: 9001234567 / farmer123');
    logger.info('   API: http://localhost:5000/api/health');
    logger.info('════════════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    logger.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
