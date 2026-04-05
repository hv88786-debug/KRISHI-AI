// controllers/equipmentController.js
// AgroGuardian AI — Equipment Rental System
// Alpha Coders · GEC Ajmer

// In-memory database (production mein MongoDB use karo)
let equipmentDB = [
  { id:'EQ001', name:'Tractor (35 HP)',      category:'tractor',   owner:'Ramesh Sharma',   location:'Ajmer',       distance:2.1,  pricePerDay:1800, pricePerHour:250, available:true,  rating:4.8, reviews:23, image:'🚜', specs:'35 HP, 2WD, with rotavator attachment', phone:'9876543210' },
  { id:'EQ002', name:'Tractor (50 HP)',      category:'tractor',   owner:'Suresh Patel',    location:'Kishangarh',  distance:28.4, pricePerDay:2200, pricePerHour:320, available:true,  rating:4.6, reviews:18, image:'🚜', specs:'50 HP, 4WD, heavy-duty', phone:'9876543211' },
  { id:'EQ003', name:'Combine Harvester',    category:'harvester', owner:'Mohan Gupta',     location:'Beawar',      distance:54.0, pricePerDay:6500, pricePerHour:900, available:false, rating:4.9, reviews:41, image:'🌾', specs:'Wheat/Maize, 14ft cutting width', phone:'9876543212' },
  { id:'EQ004', name:'Rotavator',            category:'tillage',   owner:'Kishan Lal',      location:'Ajmer',       distance:3.8,  pricePerDay:900,  pricePerHour:130, available:true,  rating:4.5, reviews:12, image:'⚙️', specs:'7ft width, fits 35-50HP tractor', phone:'9876543213' },
  { id:'EQ005', name:'Seed Drill (9-row)',   category:'seeding',   owner:'Bharat Singh',    location:'Nasirabad',   distance:18.2, pricePerDay:1200, pricePerHour:170, available:true,  rating:4.7, reviews:9,  image:'🌱', specs:'9-row, for wheat/mustard/gram', phone:'9876543214' },
  { id:'EQ006', name:'Power Sprayer',        category:'sprayer',   owner:'Dinesh Kumar',    location:'Ajmer',       distance:1.5,  pricePerDay:600,  pricePerHour:90,  available:true,  rating:4.4, reviews:31, image:'💦', specs:'500L tank, 12m boom width', phone:'9876543215' },
  { id:'EQ007', name:'Thresher',             category:'harvester', owner:'Rajesh Verma',    location:'Pushkar',     distance:12.0, pricePerDay:2000, pricePerHour:280, available:true,  rating:4.6, reviews:15, image:'🌻', specs:'For wheat, gram, soybean', phone:'9876543216' },
  { id:'EQ008', name:'Laser Land Leveller',  category:'tillage',   owner:'Vikram Yadav',    location:'Ajmer',       distance:5.2,  pricePerDay:3500, pricePerHour:500, available:false, rating:4.9, reviews:8,  image:'📐', specs:'GPS-guided, 1 acre/hour', phone:'9876543217' },
  { id:'EQ009', name:'Mini Tractor (20 HP)', category:'tractor',   owner:'Hemraj Jat',      location:'Bhinai',      distance:35.0, pricePerDay:1200, pricePerHour:170, available:true,  rating:4.3, reviews:6,  image:'🚜', specs:'20 HP, good for small fields', phone:'9876543218' },
  { id:'EQ010', name:'Drip Irrigation Set',  category:'irrigation',owner:'Ashok Patidar',   location:'Ajmer',       distance:4.1,  pricePerDay:800,  pricePerHour:110, available:true,  rating:4.7, reviews:19, image:'💧', specs:'1 acre kit, 16mm drip tape', phone:'9876543219' },
];

// Booking requests (in-memory)
let bookings = [];

// ── GET ALL EQUIPMENT ──────────────────────────────
const getAllEquipment = (req, res) => {
  const { category, available, sort = 'distance' } = req.query;
  let result = [...equipmentDB];

  if (category && category !== 'all') result = result.filter(e => e.category === category);
  if (available === 'true') result = result.filter(e => e.available);

  if (sort === 'price')    result.sort((a,b) => a.pricePerDay - b.pricePerDay);
  if (sort === 'distance') result.sort((a,b) => a.distance - b.distance);
  if (sort === 'rating')   result.sort((a,b) => b.rating - a.rating);

  res.json({ success: true, count: result.length, equipment: result });
};

// ── BOOK EQUIPMENT ─────────────────────────────────
const bookEquipment = (req, res) => {
  const { equipmentId, farmerName, phone, date, days, purpose } = req.body;
  if (!equipmentId || !farmerName || !phone || !date) {
    return res.status(400).json({ success: false, message: 'equipmentId, farmerName, phone, date required' });
  }

  const equipment = equipmentDB.find(e => e.id === equipmentId);
  if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });
  if (!equipment.available) return res.status(400).json({ success: false, message: 'Equipment not available on that date' });

  const booking = {
    id: 'BK' + Date.now(),
    equipmentId,
    equipmentName: equipment.name,
    ownerPhone: equipment.phone,
    farmerName, phone, date,
    days: days || 1,
    purpose: purpose || '',
    totalCost: (days || 1) * equipment.pricePerDay,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };
  bookings.push(booking);

  res.status(201).json({
    success: true,
    message: `Booking confirmed! Contact owner at ${equipment.phone}`,
    booking,
  });
};

// ── GET MY BOOKINGS ────────────────────────────────
const getBookings = (req, res) => {
  const { phone } = req.query;
  const result = phone ? bookings.filter(b => b.phone === phone) : bookings;
  res.json({ success: true, count: result.length, bookings: result });
};

module.exports = { getAllEquipment, bookEquipment, getBookings };
