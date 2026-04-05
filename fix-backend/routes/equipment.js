const express = require('express');
const router  = express.Router();
const { getAllEquipment, bookEquipment, getBookings } = require('../controllers/equipmentController');

// GET  /api/equipment?category=tractor&available=true&sort=distance
router.get('/',          getAllEquipment);
// POST /api/equipment/book  { equipmentId, farmerName, phone, date, days }
router.post('/book',     bookEquipment);
// GET  /api/equipment/bookings?phone=9876543210
router.get('/bookings',  getBookings);

module.exports = router;
